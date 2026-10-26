// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import TreeView from "./tree-view.vue";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach(dispose => dispose()));

describe("TreeView hierarchy appearance", () => {
  it("can hide guides without replacing expanded children or changing selection and disabled behavior", async () => {
    const state = reactive({ guides: true, selected: ["leaf"] });
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({ render: () => h(TreeView, {
      label: "Files", showIndentGuides: state.guides, selectedValue: state.selected,
      defaultExpandedValue: ["parent"],
      nodes: [{ id: "parent", label: "Parent", children: [
        { id: "leaf", label: "Leaf" }, { id: "locked", label: "Locked", disabled: true }
      ] }],
      "onUpdate:selectedValue": (value: string[] | undefined) => { state.selected = value ?? []; }
    }) });
    app.mount(host);
    cleanup.push(() => { app.unmount(); host.remove(); });
    await nextTick();
    expect(host.querySelector('[role="tree"]')?.getAttribute('aria-label')).toBe('Files');
    const leaf = host.querySelector<HTMLElement>('[data-part="item"][data-value="leaf"]')!;
    expect(leaf.getAttribute("aria-selected")).toBe("true");
    expect(host.querySelector(".qk-tree-view__indent-guide")).not.toBeNull();
    state.guides = false;
    await nextTick();
    expect(host.querySelector(".qk-tree-view--hide-guides")).not.toBeNull();
    expect(host.querySelector('[data-part="item"][data-value="leaf"]')).toBe(leaf);
    host.querySelector<HTMLElement>('[data-part="item"][data-value="locked"]')!.click();
    await nextTick();
    expect(state.selected).toEqual(["leaf"]);
    state.guides = true;
    await nextTick();
    expect(host.querySelector(".qk-tree-view--hide-guides")).toBeNull();
    expect(leaf.getAttribute("aria-selected")).toBe("true");
  });
});

it('cascades enabled leaves and uses Space for checks without selecting the row', async () => {
  const state = reactive({ checked: [] as string[] });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(TreeView, {
    label: 'Teams', checkable: true, checkedValue: state.checked, selectedValue: [], defaultExpandedValue: ['root'],
    nodes: [{ id: 'root', label: 'Root', children: [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }, { id: 'off', label: 'Off', disabled: true }] }],
    'onUpdate:checkedValue': (value: string[] | undefined) => { state.checked = value ?? []; }
  }) });
  app.mount(host); cleanup.push(() => { app.unmount(); host.remove(); }); await nextTick();
  const root = host.querySelector<HTMLElement>('[data-part="branch-control"] [role="checkbox"]')!;
  root.click(); await nextTick();
  expect(state.checked).toEqual(['one', 'two']);
  expect(root.getAttribute('aria-checked')).toBe('true');
  const one = host.querySelector<HTMLElement>('[data-part="item"][data-value="one"]')!;
  one.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })); await nextTick();
  expect(state.checked).toEqual(['two']);
  expect(root.getAttribute('aria-checked')).toBe('mixed');
});
