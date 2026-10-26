// @vitest-environment happy-dom
import { computed, effectScope, nextTick, ref, shallowRef } from "vue";
import { expect, it, vi } from "vitest";
import { useImagePreviewGroup } from "./use";

it("orders mounted instances, preserves identity on updates and removes stale members", async () => {
  const root = document.createElement("article");
  const first = document.createElement("button");
  const second = document.createElement("button");
  root.append(first, second); document.body.append(root);
  const scope = effectScope();
  const accepts = vi.fn((element: HTMLElement) => root.contains(element));
  const group = scope.run(() => useImagePreviewGroup(accepts))!;
  const source = ref("/same.svg");
  const enabled = ref(true);
  const secondMember = { id: "second", element: shallowRef<HTMLElement | null>(second), item: computed(() => ({ id: "ignored", src: source.value, alt: "second" })), enabled: computed(() => enabled.value) };
  const firstMember = { id: "first", element: shallowRef<HTMLElement | null>(first), item: computed(() => ({ id: "ignored", src: "/same.svg", alt: "first" })), enabled: computed(() => true) };
  const removeSecond = group.context.register(secondMember);
  const removeFirst = group.context.register(firstMember);
  try {
    expect(group.context.open("second", second)).toBe(true);
    expect(group.items.value.map(item => item.id)).toEqual(["first", "second"]);
    expect(group.index.value).toBe(1);
    await nextTick();
    root.prepend(second);
    group.refresh();
    expect(group.items.value.map(item => item.id)).toEqual(["second", "first"]);
    expect(group.index.value).toBe(0);
    root.prepend(first); group.refresh();
    expect(group.index.value).toBe(1);
    accepts.mockClear();
    group.index.value = 0;
    group.index.value = 1;
    source.value = "/responsive.svg";
    expect(group.items.value[1]?.src).toBe("/responsive.svg");
    expect(group.index.value).toBe(1);
    expect(group.finalFocusEl()).toBe(second);
    await nextTick();
    expect(accepts).not.toHaveBeenCalled();
    removeFirst(); await nextTick();
    expect(group.items.value.map(item => item.id)).toEqual(["second"]);
    expect(group.index.value).toBe(0);
    enabled.value = false; await nextTick();
    expect(group.opened.value).toBe(false);
    enabled.value = true; await nextTick();
    expect(group.context.open("second", second)).toBe(true);
    removeSecond(); await nextTick();
    expect(group.items.value).toEqual([]);
    expect(group.opened.value).toBe(false);
    second.remove();
    expect(group.finalFocusEl()).toBeNull();
  } finally { scope.stop(); root.remove(); }
});

it("declines isolated images and refreshes DOM order when reopening", () => {
  const root = document.createElement("article");
  const scope = effectScope();
  const group = scope.run(() => useImagePreviewGroup(element => element.parentElement === root))!;
  const buttons = [document.createElement("button"), document.createElement("button")];
  root.append(...buttons); document.body.append(root);
  buttons.forEach((element, index) => group.context.register({ id: String(index), element: shallowRef(element), item: computed(() => ({ id: String(index), src: `/${index}.svg`, alt: "" })), enabled: computed(() => true) }));
  try {
    expect(group.context.open("0", buttons[0]!)).toBe(true);
    group.opened.value = false;
    root.prepend(buttons[1]!);
    expect(group.context.open("0", buttons[0]!)).toBe(true);
    expect(group.index.value).toBe(1);
    group.opened.value = false;
    const island = document.createElement("div"); root.append(island); island.append(buttons[0]!);
    expect(group.context.open("0", buttons[0]!)).toBe(false);
    expect(group.items.value.map(item => item.id)).toEqual(["1"]);
  } finally { scope.stop(); root.remove(); }
});
