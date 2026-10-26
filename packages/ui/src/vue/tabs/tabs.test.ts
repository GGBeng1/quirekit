// @vitest-environment happy-dom
import { createApp, h, nextTick } from "vue";
import { expect, it } from "vitest";
import Tabs from "./tabs.vue";

it("links external panels without rendering duplicate content containers", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(Tabs, {
    label: "Tasks", renderPanels: false,
    items: [{ value: "home", label: "Home", panelId: "toolbar" }]
  }) });
  app.mount(host);
  await nextTick();
  try {
    expect(host.querySelector('[role="tab"]')?.getAttribute("aria-controls")).toBe("toolbar");
    expect(host.querySelector(".qk-tabs__panels")).toBeNull();
  } finally { app.unmount(); host.remove(); }
});

it("retains the first lazy panel and destroys content only when requested", async () => {
  const { ref } = await import("vue");
  const value = ref("first");
  const unmount = ref(false);
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(Tabs, {
    label: "Drafts", modelValue: value.value, lazyMount: true, unmountOnExit: unmount.value,
    items: [{ value: "first", label: "First" }, { value: "second", label: "Second" }]
  }, { content: ({ item }: { item: { value: string } }) => h("input", { "data-draft": item.value }) }) });
  app.mount(host);
  await nextTick();
  try {
    const input = host.querySelector<HTMLInputElement>('[data-draft="first"]')!;
    input.value = "Keep this draft";
    expect(host.querySelector('[data-draft="second"]')).toBeNull();
    value.value = "second";
    await nextTick();
    value.value = "first";
    await nextTick();
    expect(host.querySelector('[data-draft="first"]')).toBe(input);
    expect(input.value).toBe("Keep this draft");
    unmount.value = true;
    value.value = "second";
    await nextTick();
    expect(host.querySelector('[data-draft="first"]')).toBeNull();
    value.value = "first";
    await nextTick();
    expect(host.querySelector<HTMLInputElement>('[data-draft="first"]')!.value).toBe("");
  } finally { app.unmount(); host.remove(); }
});
