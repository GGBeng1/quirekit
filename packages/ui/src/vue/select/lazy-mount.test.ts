// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitSelectItem } from "../../components/select";
import Select from "./select.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).reverse().forEach(cleanup => cleanup()));

/**
 * Creates a stable 40-value catalog whose labels expose the latest parent revision.
 * @param revision - Parent-owned catalog revision.
 * @returns Current Select items.
 */
function createItems(revision: number): readonly QuireKitSelectItem[] {
  return Array.from({ length: 40 }, (_, index) => ({
    value: `size-${index}`,
    label: `Size ${index} revision ${revision}`
  }));
}

/** Waits for Vue and Ark Presence to finish the current lifecycle transition. */
async function settle(): Promise<void> {
  await nextTick();
  await new Promise(resolve => setTimeout(resolve, 20));
  await nextTick();
}

it("does not render a closed option subtree before first open or after exit", async () => {
  const state = reactive({ open: false, revision: 0 });
  const renderItem = vi.fn(({ item }: { item: QuireKitSelectItem }) => item.label);
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () => h(Select, {
      modelValue: "size-12",
      open: state.open,
      items: createItems(state.revision),
      label: "Font size",
      name: "font-size",
      portalled: false
    }, { item: renderItem })
  });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await settle();

  expect(renderItem).not.toHaveBeenCalled();
  expect(host.querySelector(".qk-select__content")).toBeNull();
  expect(host.querySelector<HTMLSelectElement>('select[name="font-size"]')?.value).toBe("size-12");

  for (let revision = 1; revision <= 20; revision += 1) {
    state.revision = revision;
    await nextTick();
  }
  expect(renderItem, "40 closed options must not receive 20 parent updates").not.toHaveBeenCalled();
  expect(host.querySelector("button")?.textContent).toContain("Size 12 revision 20");

  state.open = true;
  await settle();
  expect(host.querySelectorAll('[role="option"]')).toHaveLength(40);
  expect(host.querySelector('[role="option"]')?.textContent).toContain("revision 20");

  state.open = false;
  await settle();
  expect(host.querySelector(".qk-select__content")).toBeNull();
  const rendersAfterExit = renderItem.mock.calls.length;
  state.revision = 21;
  await settle();
  expect(renderItem).toHaveBeenCalledTimes(rendersAfterExit);
});
