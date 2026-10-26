// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, shallowReactive } from "vue";
import { QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { FontSize, TextStyle } from "@quirekit/extension-text-style";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { ClassicEditorToolbarContributionState } from "@classic/types";
import Field from "./field.vue";

const seen = vi.hoisted(() => ({ items: [] as unknown[], content: [] as unknown[], values: [] as unknown[] }));
vi.mock("@quirekit/ui/vue", async () => {
  const { defineComponent, h, watch } = await import("vue");
  return {
    QuireToolbarField: defineComponent({ inheritAttrs: false, setup: (_props, { slots }) => () => slots.default?.({ size: "small" }) }),
    QuireCombobox: defineComponent({ props: ["items", "contentProps", "modelValue"], setup(props) {
      watch(() => props.items, value => seen.items.push(value), { immediate: true, flush: "sync" });
      watch(() => props.contentProps, value => seen.content.push(value), { immediate: true, flush: "sync" });
      watch(() => props.modelValue, value => seen.values.push(value), { immediate: true, flush: "sync" });
      return () => h("input");
    } })
  };
});

const cleanup: Array<() => void> = [];
afterEach(() => {
  cleanup.splice(0).reverse().forEach(dispose => dispose());
  seen.items.length = seen.content.length = seen.values.length = 0;
});

it("retains preset and popup props through typing while size and locale remain live", async () => {
  const editor = new QuireEditor({ extensions: [StarterKit, TextStyle, FontSize], content: "<p>alpha</p>" });
  const host = document.createElement("div");
  const state = shallowReactive({ context: { editor, locale: "en" } as ClassicEditorToolbarContributionState["context"] });
  const scope = { context: state, disabled: false, item: {}, expanded: false, setExpanded: vi.fn() } as unknown as QuireKitToolbarRendererScope;
  const app = createApp(defineComponent({ setup: () => () => h(Field, { scope }) }));
  app.mount(host);
  cleanup.push(() => { app.unmount(); editor.destroy(); });
  editor.commands.setTextSelection(1);
  for (const letter of "abcdefghijklmnopqrst") {
    editor.commands.insertContent(letter);
    state.context = { ...state.context };
    await nextTick();
  }
  expect(seen.items).toHaveLength(1);
  expect(seen.content).toHaveLength(1);
  editor.commands.setFontSize("18pt");
  state.context = { ...state.context };
  await nextTick();
  expect(seen.values.at(-1)).toBe("18");
  expect(seen.items).toHaveLength(1);
  state.context = { ...state.context, locale: "zh-CN" };
  await nextTick();
  expect(seen.items).toHaveLength(2);
  expect(seen.items.at(-1)).toContainEqual({ label: "小二", value: "zh:18", points: 18 });
  expect(seen.content.at(-1)).toMatchObject({ lang: "zh-CN" });
  expect(seen.values.at(-1)).toBe("zh:18");
});
