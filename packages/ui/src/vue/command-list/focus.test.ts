// @vitest-environment happy-dom
import { createApp, h, nextTick, shallowRef } from "vue";
import { afterEach, expect, it } from "vitest";
import CommandList from "./command-list.vue";
import type { QuireKitCommandListHandle, QuireKitCommandListItem } from "./types";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach(dispose => dispose()));
/** @param external - Whether an editor owns focus. @returns Mounted public command surface. */
async function fixture(external = true) {
  const host = document.createElement("div"), input = document.createElement("textarea");
  input.setAttribute("aria-controls", "original"); document.body.append(input, host); input.focus();
  const ref = shallowRef<QuireKitCommandListHandle>(), selected: string[] = [];
  const items = shallowRef<readonly QuireKitCommandListItem[]>([{ key: "a", label: "A" }, { key: "b", label: "B", disabled: true }, { key: "c", label: "C" }]);
  const app = createApp({ render: () => h(CommandList, { ref, label: "Commands", items: items.value, focusOwner: external ? input : undefined, onSelect: key => selected.push(key) }) });
  app.mount(host); await nextTick();
  const dispose = () => { app.unmount(); host.remove(); input.remove(); };
  cleanup.push(dispose);
  return { host, input, items, selected, api: ref.value!, app };
}
it("navigates and activates virtually while preserving native input focus and ARIA ownership", async () => {
  const f = await fixture();
  const key = new KeyboardEvent("keydown", { key: "ArrowDown", cancelable: true });
  expect(f.api.handleKeydown(key)).toBe(true); await nextTick();
  expect(key.defaultPrevented).toBe(true); expect(document.activeElement).toBe(f.input);
  const active = f.host.querySelector('[data-highlighted]')!;
  expect(active.getAttribute("data-command-key")).toBe("c");
  expect(f.input.getAttribute("aria-activedescendant")).toBe(active.id);
  expect(f.api.handleKeydown(new KeyboardEvent("keydown", { key: "Enter", cancelable: true }))).toBe(true);
  expect(f.selected).toEqual(["c"]);
  f.app.unmount(); expect(f.input.getAttribute("aria-controls")).toBe("original"); expect(f.input.hasAttribute("aria-activedescendant")).toBe(false);
});
it("retains the highlighted identity when filtering, resets removed items, and ignores composition/modifiers", async () => {
  const f = await fixture();
  f.api.handleKeydown(new KeyboardEvent("keydown", { key: "ArrowDown" })); await nextTick();
  f.items.value = [{ key: "c", label: "C" }, { key: "d", label: "D" }]; await nextTick();
  expect(f.host.querySelector('[data-highlighted]')?.getAttribute("data-command-key")).toBe("c");
  for (const init of [{ isComposing: true }, { ctrlKey: true }, { shiftKey: true }]) {
    expect(f.api.handleKeydown(new KeyboardEvent("keydown", { key: "Enter", ...init }))).toBe(false);
  }
  f.items.value = []; await nextTick();
  expect(f.api.handleKeydown(new KeyboardEvent("keydown", { key: "Enter" }))).toBe(false);
  expect(f.input.hasAttribute("aria-activedescendant")).toBe(false);
});
it("keeps ordinary roving-focus menus working", async () => {
  const f = await fixture(false);
  const first = f.host.querySelector<HTMLButtonElement>("button")!; first.focus();
  first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })); await nextTick();
  expect(document.activeElement?.getAttribute("data-command-key")).toBe("c");
  expect(f.input.getAttribute("aria-controls")).toBe("original");
});
it("continues keyboard navigation from the hovered row with only one virtual highlight", async () => {
  const f = await fixture();
  const last = f.host.querySelector<HTMLButtonElement>('[data-command-key="c"]')!;
  last.dispatchEvent(new PointerEvent("pointermove", { bubbles: true })); await nextTick();
  expect(f.input.getAttribute("aria-activedescendant")).toBe(last.id);
  f.api.handleKeydown(new KeyboardEvent("keydown", { key: "ArrowUp" })); await nextTick();
  expect(f.host.querySelectorAll("[data-highlighted]")).toHaveLength(1);
  expect(f.host.querySelector("[data-highlighted]")?.getAttribute("data-command-key")).toBe("a");
  expect(last.hasAttribute("data-virtual-focus")).toBe(true);
  expect(document.activeElement).toBe(f.input);
});
