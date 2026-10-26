// @vitest-environment happy-dom
import { createApp, h, nextTick, ref } from "vue";
import type { VNode } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import Alert from "./alert.vue";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach(dispose => dispose()));

/**
 * Mounts a reactive consumer of the public Alert component.
 * @param render - Consumer render function.
 * @returns Mounted document host.
 */
function mount(render: () => VNode): HTMLDivElement {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  return host;
}

describe("Alert", () => {
  it("closes locally with an icon-only native button and emits one close event", async () => {
    const close = vi.fn();
    const update = vi.fn();
    const host = mount(() => h(Alert, { title: "提示", closable: true, onClose: close, "onUpdate:open": update }));
    const button = host.querySelector("button")!;
    expect(button.type).toBe("button");
    expect(button.getAttribute("aria-label")).toBe("关闭提示");
    expect(button.textContent?.trim()).toBe("");
    button.click();
    await nextTick();
    expect(host.querySelector(".qk-alert")).toBeNull();
    expect(close).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("supports parent dismissal, reopening and a stable accessible title", async () => {
    const open = ref(false);
    const host = mount(() => h(Alert, { open: open.value, closable: true, title: "状态", role: "status", "onUpdate:open": value => { open.value = value; } }));
    expect(host.querySelector(".qk-alert")).toBeNull();
    open.value = true;
    await nextTick();
    const firstId = host.querySelector("[role=status]")!.getAttribute("aria-labelledby")!;
    expect(document.getElementById(firstId)?.textContent).toBe("状态");
    host.querySelector("button")!.click();
    await nextTick();
    expect(open.value).toBe(false);
    open.value = true;
    await nextTick();
    expect(host.querySelector("[role=status]")!.getAttribute("aria-labelledby")).toBe(firstId);
    open.value = false;
    await nextTick();
    expect(host.querySelector(".qk-alert")).toBeNull();
  });

  it("keeps static messages quiet and handles title-free content without dangling associations", () => {
    const host = mount(() => h("div", [
      h(Alert, { title: "第一条", icon: false }),
      h(Alert, {}, { title: () => "第二条", actions: () => h("button", "查看详情") }),
      h(Alert, { description: "只有正文", icon: false })
    ]));
    const alerts = Array.from(host.querySelectorAll(".qk-alert"));
    expect(alerts.every(el => el.getAttribute("role") === "group" && !el.hasAttribute("aria-live"))).toBe(true);
    const ids = alerts.slice(0, 2).map(el => el.getAttribute("aria-labelledby"));
    expect(new Set(ids).size).toBe(2);
    expect(alerts[2]!.hasAttribute("aria-labelledby")).toBe(false);
    expect(alerts[0]!.querySelector(".qk-alert__icon")).toBeNull();
    expect(alerts[1]!.querySelector(".qk-alert__icon")).not.toBeNull();
    expect(alerts[1]!.querySelector(".qk-alert__actions")!.textContent).toBe("查看详情");
  });
});
