// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitComboboxItem } from "../../components/combobox";
import Combobox from "./combobox.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).reverse().forEach(cleanup => cleanup()));

/** Waits for Vue and Ark Presence to finish the current lifecycle transition. */
async function settle(): Promise<void> {
  await nextTick();
  await new Promise(resolve => setTimeout(resolve, 20));
  await nextTick();
}

it("mounts current filtered options only while the popup is open", async () => {
  const items: readonly QuireKitComboboxItem[] = [
    { value: "alpha", label: "Alpha" },
    { value: "beta", label: "Beta" },
    { value: "gamma", label: "Gamma" }
  ];
  const state = reactive({ open: false, inputValue: "" });
  const renderItem = vi.fn(({ item }: { item: QuireKitComboboxItem }) => item.label);
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () => h(Combobox, {
      open: state.open,
      inputValue: state.inputValue,
      items,
      label: "Find document",
      name: "document",
      portalled: false
    }, { item: renderItem })
  });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await settle();

  expect(renderItem).not.toHaveBeenCalled();
  expect(host.querySelector(".qk-combobox__content")).toBeNull();
  expect(host.querySelector<HTMLInputElement>('input[type="hidden"][name="document"]')).not.toBeNull();

  state.inputValue = "bet";
  await nextTick();
  expect(renderItem).not.toHaveBeenCalled();
  state.open = true;
  await settle();
  expect(host.querySelectorAll('[role="option"]')).toHaveLength(1);
  expect(host.querySelector('[role="option"]')?.textContent).toContain("Beta");

  state.open = false;
  await settle();
  expect(host.querySelector(".qk-combobox__content")).toBeNull();
  const rendersAfterExit = renderItem.mock.calls.length;
  state.inputValue = "gam";
  await settle();
  expect(renderItem).toHaveBeenCalledTimes(rendersAfterExit);
});

it("renders only nonempty filtered groups with native group semantics", async () => {
  const state = reactive({ open: true, inputValue: "recent" });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () => h(Combobox, {
      open: state.open,
      inputValue: state.inputValue,
      items: [
        { value: "recent", label: "Recent Serif", group: "Recent fonts" },
        { value: "other", label: "Other Sans", group: "All fonts" }
      ],
      label: "Find font",
      portalled: false
    })
  });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await settle();

  expect(host.querySelectorAll('[role="group"]')).toHaveLength(1);
  expect(host.querySelector(".qk-combobox__group-label")?.textContent).toBe("Recent fonts");
  expect(host.querySelectorAll('[role="option"]')).toHaveLength(1);
  state.inputValue = "";
  await settle();
  expect(host.querySelectorAll('[role="group"]')).toHaveLength(2);
});
