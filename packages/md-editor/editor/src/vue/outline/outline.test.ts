// @vitest-environment happy-dom
import { createApp, h, nextTick, shallowRef } from "vue";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EditorView } from "@quirekit/cm-view";
import { forceParsing } from "@quirekit/cm-language";
import MdEditor from "../editor.vue";
import type { MdEditorInstance } from "../types";

const dispose: (() => void)[] = [];
beforeEach(() => {
  Object.defineProperty(document, "fonts", { configurable: true, value: Object.assign(new EventTarget(), { ready: Promise.resolve() }) });
  // A wide editor root selects the side rail; observers report once on observe.
  vi.stubGlobal("ResizeObserver", class { constructor(private readonly callback: () => void) {} observe(): void { this.callback(); } disconnect(): void {} });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 1280, 40));
});
afterEach(() => { for (const cleanup of dispose.splice(0)) cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

/** @param props - MdEditor props. @returns Mounted product and its host element. */
async function mount(props: Record<string, unknown>) {
  const element = document.createElement("div"); document.body.append(element);
  const product = shallowRef<MdEditorInstance>();
  const app = createApp({ render: () => h(MdEditor, { ref: product, layout: "document", ...props }) });
  dispose.push(() => { app.unmount(); element.remove(); });
  app.mount(element); await nextTick();
  await vi.waitFor(() => expect(product.value?.editor).toBeDefined());
  const view = EditorView.findFromDOM(product.value!.editor!.element)!;
  expect(forceParsing(view, view.state.doc.length, 5000)).toBe(true);
  view.dispatch({}); await nextTick();
  return { element, product, view };
}

it("renders nested headings in the side rail and navigates to a chosen heading", async () => {
  const markdown = "# One\n\nbody\n\n## Two **bold**\n\ntext\n\n# Three\n";
  const { element, view } = await mount({ markdown, outline: true });
  const root = element.querySelector(".md-editor")!;
  expect(root.getAttribute("data-outline")).toBe("side");
  await vi.waitFor(() => expect([...element.querySelectorAll(".md-editor__outline .qk-tree-view__label")].map(row => row.textContent?.trim())).toEqual(["One", "Two bold", "Three"]));
  const target = element.querySelector<HTMLElement>('.md-editor__outline [data-part="item"][data-value="heading-13"]')!;
  target.click(); await nextTick();
  expect(view.state.selection.main.head).toBe(markdown.indexOf("Two"));
});

it("mounts no outline unless requested in the document layout", async () => {
  const off = await mount({ markdown: "# One\n" });
  expect(off.element.querySelector(".md-editor__outline")).toBeNull();
  const embedded = await mount({ markdown: "# One\n", outline: true, layout: "embedded" });
  expect(embedded.element.querySelector(".md-editor__outline")).toBeNull();
});

it("collapses the pinned outline to its toggle and pins it again, on the configured side", async () => {
  const { element } = await mount({ markdown: "# One\n", outline: true, outlinePosition: "start" });
  const root = element.querySelector(".md-editor")!;
  expect(root.getAttribute("data-outline-position")).toBe("start");
  element.querySelector<HTMLElement>('.md-editor__outline-title button[aria-label="收起大纲"]')!.click(); await nextTick();
  expect(root.getAttribute("data-outline")).toBe("toggle");
  // With the fixed toolbar the collapsed control sits at the toolbar start and the document keeps no outline column.
  expect(element.querySelector(".md-editor__outline")).toBeNull();
  expect(root.hasAttribute("data-rails")).toBe(false);
  element.querySelector<HTMLElement>('.md-editor__toolbar-start button[aria-label="展开大纲"]')!.click(); await nextTick();
  expect(root.getAttribute("data-outline")).toBe("side");
});
