// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import Listbox from "./listbox.vue";

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup());
  vi.restoreAllMocks();
});

/** @returns A real Listbox with its host-owned selection and native focus surface. */
async function mountListbox() {
  const host = document.createElement("div");
  document.body.append(host);
  const state = reactive({ value: ["body"], disabled: false });
  const changes: string[][] = [];
  const app = createApp(defineComponent({
    setup: () => () => h(Listbox, {
      label: "Text styles", items: [
        { value: "body", label: "Body" }, { value: "title", label: "Title" },
        { value: "locked", label: "Locked", disabled: true }
      ], modelValue: state.value, disabled: state.disabled,
      "onUpdate:modelValue": (value: string[] | undefined) => {
        if (value !== undefined) { state.value = value; changes.push(value); }
      }
    })
  }));
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const content = host.querySelector<HTMLElement>('[role="listbox"]')!;
  const title = host.querySelector<HTMLElement>('[data-value="title"]')!;
  const locked = host.querySelector<HTMLElement>('[data-value="locked"]')!;
  return { host, state, changes, content, title, locked };
}

describe("Listbox pointer focus", () => {
  it("focuses without scrolling before the machine handles down, and selects only once on click", async () => {
    const { state, changes, content, title } = await mountListbox();
    const focus = vi.spyOn(content, "focus");
    title.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
    expect(focus.mock.calls[0]).toEqual([{ preventScroll: true }]);
    expect(document.activeElement).toBe(content);
    expect(state.value).toEqual(["body"]);
    expect(changes).toEqual([]);
    title.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
    title.click();
    await nextTick();
    expect(state.value).toEqual(["title"]);
    expect(changes).toEqual([["title"]]);
    expect(title.getAttribute("aria-selected")).toBe("true");
  });

  it("does not add pointer focus for cancelled, secondary, or disabled item activation", async () => {
    const { state, changes, content, title, locked } = await mountListbox();
    const focus = vi.spyOn(content, "focus");
    const cancelled = new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 });
    cancelled.preventDefault();
    title.dispatchEvent(cancelled);
    title.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 2 }));
    locked.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
    locked.click();
    state.disabled = true;
    await nextTick();
    title.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
    title.click();
    await nextTick();
    expect(focus.mock.calls.every(args => args.length === 0)).toBe(true);
    expect(state.value).toEqual(["body"]);
    expect(changes).toEqual([]);
  });
});
