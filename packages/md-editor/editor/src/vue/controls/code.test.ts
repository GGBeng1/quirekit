// @vitest-environment happy-dom
import { createApp, h, nextTick, provide, reactive, shallowRef } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MsfeNodeViewProps, MsfeResult } from "@quirekit/msfe-core";
import type { CodeBlockAttributes } from "@quirekit/msfe-code-block";
import { mdNarrowKey } from "../context";
import CodeControl from "./code.vue";

const cleanups: Array<() => void> = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); });

/** @param initiallyNarrow - Shared product breakpoint. @returns A mounted source-bound control whose owner can reject or invalidate writes. */
async function mountCode(initiallyNarrow = false) {
  const state = reactive({ language: "custom-lang", readOnly: false, valid: true, accepted: true });
  const narrow = shallowRef(initiallyNarrow);
  const update = vi.fn((patch: Partial<CodeBlockAttributes>): MsfeResult => {
    if (!state.accepted) return { ok: false, reason: "invalid-change" };
    state.language = patch.language ?? state.language;
    return { ok: true };
  });
  const nodeView: MsfeNodeViewProps<CodeBlockAttributes> = {
    id: "code", get attrs() { return { language: state.language }; },
    get readOnly() { return state.readOnly; }, status: "ready", resource: undefined,
    getRange: () => state.valid ? { from: 0, to: 40 } : null,
    updateAttributes: update, deleteNode: () => ({ ok: true }), revealSource: () => false,
  };
  const host = document.createElement("div"); document.body.append(host);
  const app = createApp({ setup() { provide(mdNarrowKey, narrow); return () => h(CodeControl, { nodeView }); } });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return { host, state, update, narrow, trigger: host.querySelector<HTMLButtonElement>('[role="combobox"]')! };
}

/** @param trigger - Current public Select trigger. @param label - Visible finite option. @returns A real mounted option. */
async function openOption(trigger: HTMLButtonElement, label: string): Promise<HTMLElement> {
  trigger.click(); await nextTick();
  let option: HTMLElement | undefined;
  await vi.waitFor(() => {
    option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(item => item.textContent?.trim() === label);
    expect(option).toBeDefined();
  });
  return option!;
}

describe("code language source ownership", () => {
  it("retains custom languages and writes an empty fence language exactly once", async () => {
    const { trigger, state, update } = await mountCode();
    expect(trigger.textContent).toContain("custom-lang");
    const option = await openOption(trigger, "纯文本");
    option.click(); await nextTick();
    expect(update).toHaveBeenCalledExactlyOnceWith({ language: "" });
    expect(state.language).toBe("");
    expect(trigger.textContent).toContain("纯文本");
  });

  it.each(["invalid", "readOnly", "rejected"] as const)("retains the canonical language after a %s choice", async condition => {
    const { host, trigger, state, update } = await mountCode();
    const option = await openOption(trigger, "JavaScript");
    if (condition === "invalid") state.valid = false;
    else if (condition === "readOnly") state.readOnly = true;
    else state.accepted = false;
    option.click(); await nextTick();
    expect(state.language).toBe("custom-lang");
    expect(trigger.textContent).toContain("custom-lang");
    expect(update).toHaveBeenCalledTimes(condition === "rejected" ? 1 : 0);
    expect(host.querySelector('[role="status"]')?.textContent).toBeTruthy();
  });

  it("keeps an open desktop choice across the shared breakpoint without source writes", async () => {
    const { host, trigger, narrow, update } = await mountCode();
    await openOption(trigger, "JavaScript");
    narrow.value = true; await nextTick();
    expect(host.querySelector('[role="combobox"]')).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(update).not.toHaveBeenCalled();
  });

  it("keeps the searchable mobile task and applies the same guarded source write", async () => {
    const { host, state, update } = await mountCode(true);
    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="代码语言"]')!;
    const option = await openOption(trigger, "纯文本");
    expect(document.querySelector('[role="dialog"][aria-modal="true"]')).not.toBeNull();
    expect(document.querySelector('input[type="search"]')).not.toBeNull();
    option.click();
    await vi.waitFor(() => expect(update).toHaveBeenCalledExactlyOnceWith({ language: "" }));
    expect(state.language).toBe("");
  });
});
