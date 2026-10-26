// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { QuireKitClipboardErrorDetails, QuireKitClipboardMode, QuireKitClipboardSlotProps } from "../../components/clipboard";
import Clipboard from "./clipboard.vue";

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup());
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** @returns A pending clipboard write and its externally controlled completion. */
function pendingWrite() {
  let resolve!: () => void;
  const promise = new Promise<void>(complete => { resolve = complete; });
  return { promise, resolve };
}

/**
 * Mounts the public component with observable events and slot feedback.
 * @param mode - Public content presentation mode.
 * @returns Rendered host, public state and recorded event callbacks.
 */
async function mountClipboard(mode: QuireKitClipboardMode = "input") {
  const state = reactive({ value: "QK-123", disabled: false });
  const status = vi.fn();
  const failure = vi.fn<(details: QuireKitClipboardErrorDetails) => void>();
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({
    setup: () => () => h(Clipboard, {
      ...state, mode, label: "文档标识", timeout: 500,
      onStatusChange: status, onCopyError: failure
    }, {
      trigger: (slot: QuireKitClipboardSlotProps) => h("span", { "data-slot-feedback": "" },
        slot.copying ? "等待结果" : slot.error ? "重新复制" : slot.copied ? "复制完成" : "复制标识")
    })
  }));
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return { host, state, status, failure };
}

describe("Clipboard confirmed system writes", () => {
  it.each(["input", "text", "icon"] as const)("waits for %s writes before reporting success and rejects duplicate requests", async mode => {
    vi.useFakeTimers();
    const result = pendingWrite();
    const write = vi.spyOn(navigator.clipboard, "writeText").mockReturnValue(result.promise);
    const { host, status } = await mountClipboard(mode);
    const button = host.querySelector("button")!;
    button.focus();
    button.click();
    button.click();
    await nextTick();
    expect(write).toHaveBeenCalledExactlyOnceWith("QK-123");
    expect(status).not.toHaveBeenCalled();
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(button);
    expect(host.querySelector("[data-slot-feedback]")?.textContent).toBe("等待结果");
    expect(host.querySelector("[role=status]")?.textContent).toBe("");
    result.resolve();
    await result.promise;
    await nextTick();
    expect(status).toHaveBeenCalledExactlyOnceWith({ copied: true });
    expect(document.activeElement).toBe(button);
    expect(button.hasAttribute("aria-disabled")).toBe(false);
    expect(button.disabled).toBe(false);
    expect(host.querySelector("[role=status]")?.textContent).toBe("已复制");
    expect(button.hasAttribute("data-copied")).toBe(true);
    await vi.advanceTimersByTimeAsync(500);
    expect(button.hasAttribute("data-copied")).toBe(false);
    expect(status).toHaveBeenCalledTimes(1);
  });

  it("reports rejection without success and allows a successful retry", async () => {
    const reason = new DOMException("Permission denied", "NotAllowedError");
    const write = vi.spyOn(navigator.clipboard, "writeText")
      .mockRejectedValueOnce(reason).mockResolvedValueOnce();
    const { host, status, failure } = await mountClipboard();
    const button = host.querySelector("button")!;
    button.click();
    await nextTick();
    await nextTick();
    expect(status).not.toHaveBeenCalled();
    expect(failure).toHaveBeenCalledExactlyOnceWith({ value: "QK-123", error: reason });
    expect(host.querySelector("[role=status]")?.textContent).toBe("复制失败，请重试或手动复制");
    expect(button.getAttribute("aria-describedby")).toBe(host.querySelector("[role=status]")?.id);
    expect(button.disabled).toBe(false);
    button.click();
    await nextTick();
    await nextTick();
    expect(write).toHaveBeenCalledTimes(2);
    expect(status).toHaveBeenCalledExactlyOnceWith({ copied: true });
    expect(button.hasAttribute("aria-describedby")).toBe(false);
    expect(host.querySelector("[data-slot-feedback]")?.textContent).toBe("复制完成");
  });

  it("does not mark replacement text copied and keeps manual selection independent", async () => {
    const result = pendingWrite();
    vi.spyOn(navigator.clipboard, "writeText").mockReturnValue(result.promise);
    const { host, state, status } = await mountClipboard();
    const input = host.querySelector("input")!;
    expect(host.querySelector("label")?.htmlFor).toBe(input.id);
    input.focus();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(state.value.length);
    input.dispatchEvent(new Event("copy", { bubbles: true }));
    expect(status).not.toHaveBeenCalled();
    host.querySelector("button")!.click();
    state.value = "QK-456";
    await nextTick();
    result.resolve();
    await result.promise;
    await nextTick();
    expect(input.value).toBe("QK-456");
    expect(host.querySelector("[role=status]")?.textContent).toBe("");
    expect(status).not.toHaveBeenCalled();
    state.disabled = true;
    await nextTick();
    expect(host.querySelector("button")!.disabled).toBe(true);
  });
});
