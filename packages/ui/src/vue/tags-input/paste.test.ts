// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import TagsInput from "./tags-input.vue";
import type { QuireKitTagsInputInvalidDetails } from "../../components/tags-input";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts a controlled tag collection with observable invalid notifications.
 * @param options - Public policy overrides.
 * @returns Host state and a native input that receives clipboard insertion events.
 */
async function mountTags(options: { allowOverflow?: boolean; addOnPaste?: boolean } = {}) {
  const state = reactive({ value: ["design"] });
  const onInvalid = vi.fn<(details: QuireKitTagsInputInvalidDetails) => void>();
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({
    setup: () => () => h(TagsInput, {
      label: "Tags", max: 2, modelValue: state.value, ...options,
      onValueInvalid: onInvalid,
      "onUpdate:modelValue": (value: string[] | undefined) => { if (value) state.value = value; }
    })
  }));
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const input = host.querySelector<HTMLInputElement>('[data-part="input"]')!;
  input.focus();
  await nextTick();
  return { input, state, host, onInvalid };
}

/**
 * Delivers the native input event produced after a clipboard insertion.
 * @param input - Focused tag input.
 * @param text - Complete text after insertion.
 */
function insertPaste(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" }));
}

describe("TagsInput pasted quantity", () => {
  it("rejects an overflowing batch atomically, preserves its draft, and accepts a correction", async () => {
    const { input, state, host, onInvalid } = await mountTags();
    insertPaste(input, "review,legal");
    await nextTick();
    expect(state.value).toEqual(["design"]);
    expect(input.value).toBe("review,legal");
    expect(onInvalid).toHaveBeenCalledWith({ reason: "rangeOverflow" });
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("最多只能添加 2 个标签");
    insertPaste(input, "review");
    await vi.waitFor(() => expect(state.value).toEqual(["design", "review"]));
    expect(input.value).toBe("");
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });

  it("counts unique normalized values before enforcing the quantity limit", async () => {
    const { input, state, onInvalid } = await mountTags();
    insertPaste(input, "design, review ");
    await vi.waitFor(() => expect(state.value).toEqual(["design", "review"]));
    expect(onInvalid).not.toHaveBeenCalled();
  });

  it("honors explicit overflow and plain-text paste policies", async () => {
    const overflowing = await mountTags({ allowOverflow: true });
    insertPaste(overflowing.input, "review,legal");
    await vi.waitFor(() => expect(overflowing.state.value).toEqual(["design", "review", "legal"]));
    const plain = await mountTags({ addOnPaste: false });
    insertPaste(plain.input, "review,legal");
    await nextTick();
    expect(plain.state.value).toEqual(["design"]);
    expect(plain.input.value).toBe("review,legal");
    expect(plain.onInvalid).not.toHaveBeenCalled();
  });
});
