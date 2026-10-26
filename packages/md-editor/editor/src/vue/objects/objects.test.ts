// @vitest-environment happy-dom
import { createApp, h, nextTick, shallowRef } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorView } from "@quirekit/cm-view";
import { createMindMapEmbed } from "@quirekit/mind-map";
import { mindMapMarkdown } from "@quirekit/msfe-mind-map";
import { createDataView, dataViewMarkdown } from "@quirekit/data-view";
import MdEditor from "../editor.vue";
import type { MdEditorInstance } from "../types";
import { mdEditorMessages } from "../messages";
import { mdObjectFrame, resolveMdObject, readMdObjectFacts } from "./resolve";
import { collectMdObjectGallery } from "./gallery";
import { mdObjectActions, removeMdObject } from "./actions";

const dispose: (() => void)[] = [];
beforeEach(() => {
  Object.defineProperty(document, "fonts", { configurable: true, value: Object.assign(new EventTarget(), { ready: Promise.resolve(), load: () => Promise.resolve([]) }) });
});
afterEach(() => { for (const cleanup of dispose.splice(0)) cleanup(); vi.useRealTimers(); });

const mind = { ...createMindMapEmbed("plan", "项目计划"), preview: { dataUrl: "data:image/png;base64,AAAA", width: 10, height: 20 } };
const image = "![封面](https://example.com/cover.png \"周报\")";
const diagram = "> ```mermaid\n> flowchart LR\n>   A --> B\n> ```", formula = "$$\nE = mc^2\n$$";
const markdown = `开头\n\n${mindMapMarkdown(mind)}\n\n图片 ${image} 结尾\n\n${diagram}\n\n${formula}\n`;

/** @param source - Canonical fixture source. @returns Mounted product editor over the fixture document. */
async function mount(source = markdown) {
  vi.useFakeTimers();
  const element = document.createElement("div"); document.body.append(element);
  const product = shallowRef<MdEditorInstance>();
  const failures: unknown[] = [];
  const app = createApp({ render: () => h(MdEditor, { markdown: source, ref: product, onError: (error: unknown) => failures.push(error) }) });
  dispose.push(() => { app.unmount(); element.remove(); });
  app.mount(element); await nextTick(); await vi.advanceTimersByTimeAsync(50); await nextTick();
  expect(failures.map(error => error instanceof Error ? error.stack : error)).toEqual([]);
  const editor = product.value!.editor!, view = EditorView.findFromDOM(editor.element)!;
  return { element, editor, view };
}

describe("object selection", () => {
  it.each(["ArrowLeft", "ArrowRight"])("returns %s from a selected image to its mapped source boundary without adding history", async key => {
    const { element, editor, view } = await mount();
    const root = element.querySelector<HTMLElement>("[data-md-object=image]")!;
    root.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    await nextTick();
    expect(document.activeElement).toBe(root);
    const prefix = "Added before selection.\n\n";
    expect(editor.run(() => ({ changes: { from: 0, insert: prefix } })).ok).toBe(true);
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    root.dispatchEvent(event); await nextTick();
    const start = prefix.length + markdown.indexOf(image);
    expect(editor.state.selection.main.head).toBe(start + (key === "ArrowRight" ? image.length : 0));
    expect(event.defaultPrevented).toBe(true);
    expect(view.hasFocus).toBe(true);
    expect(editor.element.hasAttribute("data-md-object-selected")).toBe(false);
    expect(editor.getMarkdown()).toBe(prefix + markdown);
    editor.undo(); expect(editor.getMarkdown()).toBe(markdown);
  });

  it("leaves modified arrows and composition with the focused object", async () => {
    const { element, editor } = await mount();
    const root = element.querySelector<HTMLElement>("[data-md-object=image]")!;
    root.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 })); await nextTick();
    const selection = editor.state.selection;
    for (const modifier of [{ shiftKey: true }, { altKey: true }, { ctrlKey: true }, { metaKey: true }, { isComposing: true }]) {
      const event = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true, ...modifier });
      root.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(root);
      expect(editor.state.selection).toBe(selection);
    }
  });

  it("selects and deletes a data view as one source object, without image-only actions", async () => {
    const source = dataViewMarkdown(createDataView("object"));
    const { element, editor, view } = await mount(`开头\n\n${source}\n\n结尾`);
    const figure = element.querySelector<HTMLElement>("[data-qk-data-view]")!;
    const hit = resolveMdObject(view, editor, figure)!;
    expect(hit.kind).toBe("dataView");
    expect(editor.state.sliceDoc(hit.range.from, hit.range.to)).toBe(source);
    const facts = readMdObjectFacts(editor, hit.kind, hit.range, figure)!;
    expect(facts).toMatchObject({ title: "表格", src: null });
    expect(mdObjectActions(hit.kind, facts, false, mdEditorMessages["zh-CN"]).map(item => item.value))
      .toEqual(["edit", "divider", "copy", "cut", "delete"]);
    expect(mdObjectActions(hit.kind, facts, true, mdEditorMessages["zh-CN"]).map(item => item.value))
      .toEqual(["divider", "copy"]);
    figure.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    figure.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true, cancelable: true }));
    expect(editor.getMarkdown()).not.toContain("quirekit-data-view");
    editor.undo(); expect(editor.getMarkdown()).toBe(`开头\n\n${source}\n\n结尾`);
  });
  it("maps diagram and image components to their exact source and facts", async () => {
    const { element, editor, view } = await mount();
    const figure = element.querySelector<HTMLElement>("[data-qk-mind-map]")!;
    const hit = resolveMdObject(view, editor, figure)!;
    expect(hit.kind).toBe("mindMap");
    expect(editor.state.sliceDoc(hit.range.from, hit.range.to)).toBe(mindMapMarkdown(mind));
    expect(readMdObjectFacts(editor, "mindMap", hit.range, figure)).toMatchObject({ title: "项目计划", src: mind.preview.dataUrl, paper: true });

    const root = element.querySelector<HTMLElement>("[data-md-object=image]")!;
    const picture = resolveMdObject(view, editor, root)!;
    expect(picture.kind).toBe("image");
    expect(editor.state.sliceDoc(picture.range.from, picture.range.to)).toBe(image);
    expect(readMdObjectFacts(editor, "image", picture.range, null)).toMatchObject({ title: "周报", alt: "封面", src: "https://example.com/cover.png" });
  });

  it("previews every image and saved diagram in document order, starting at the opener", async () => {
    const { element, editor, view } = await mount();
    const picture = resolveMdObject(view, editor, element.querySelector<HTMLElement>("[data-md-object=image]")!)!;
    const gallery = collectMdObjectGallery(view, editor, picture.range, "正在渲染…");
    expect(gallery.items.map(item => item.id.split(":")[0])).toEqual(["mindMap", "image", "mermaid"]);
    expect(gallery.items.slice(0, 2).map(item => item.src)).toEqual([mind.preview.dataUrl, "https://example.com/cover.png"]);
    expect(gallery.items[0]).toMatchObject({ alt: "项目计划", background: "#fff" });
    expect(gallery.items[1]).toMatchObject({ alt: "封面", title: "周报" });
    expect(gallery.index).toBe(1);
    // The Mermaid preview has not produced SVG here, so it waits as a placeholder and formulas stay out.
    expect(gallery.pending).toEqual([{ id: gallery.items[2]!.id, language: "mermaid", text: "flowchart LR\n  A --> B" }]);
  });

  it("resolves block previews whose widget starts before a container prefix", async () => {
    const { element, editor, view } = await mount();
    const preview = element.querySelector<HTMLElement>("[data-msfe-preview=mermaid]")!;
    const hit = resolveMdObject(view, editor, preview)!;
    expect(hit.kind).toBe("mermaid");
    expect(editor.state.sliceDoc(hit.range.from, hit.range.to)).toBe(diagram.slice(2));
    const math = resolveMdObject(view, editor, element.querySelector<HTMLElement>("[data-msfe-preview=displayMath]")!)!;
    expect(math.kind).toBe("math");
    expect(editor.state.sliceDoc(math.range.from, math.range.to)).toBe(formula);
    expect(readMdObjectFacts(editor, "math", math.range, null)).toMatchObject({ src: null, alt: "E = mc^2" });
  });

  it("removes an image or a complete diagram block in one undoable step", async () => {
    const { element, editor, view } = await mount();
    const picture = resolveMdObject(view, editor, element.querySelector<HTMLElement>("[data-md-object=image]")!)!;
    expect(editor.run(removeMdObject("image", picture.range)).ok).toBe(true);
    expect(editor.getMarkdown()).toContain("图片  结尾");
    editor.undo();
    expect(editor.getMarkdown()).toBe(markdown);

    const figure = element.querySelector<HTMLElement>("[data-qk-mind-map]")!;
    figure.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    figure.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true, cancelable: true }));
    expect(editor.getMarkdown()).toBe(`开头\n\n图片 ${image} 结尾\n\n${diagram}\n\n${formula}\n`);
    editor.undo();
    expect(editor.getMarkdown()).toBe(markdown);
  });

  it("outlines the code block surface that frames a single preview", () => {
    const surface = document.createElement("div"), view = document.createElement("div"), preview = document.createElement("span");
    surface.className = "qk-code-block"; preview.dataset.msfePreview = "textDiagram";
    view.append(preview); surface.append(view);
    expect(mdObjectFrame(preview)).toBe(surface);
    const other = document.createElement("span"); other.dataset.msfePreview = "mermaid"; surface.append(other);
    expect(mdObjectFrame(preview)).toBe(preview);
  });

  it("offers only non-mutating actions on read-only objects", () => {
    const text = mdEditorMessages["zh-CN"], facts = { title: "白板", alt: "白板", src: "data:image/png;base64,AAAA", paper: true, format: "png" as const };
    const values = (readOnly: boolean, kind: "whiteboard" | "image" | "math") => mdObjectActions(kind, facts, readOnly, text).map(item => item.value).filter(value => value !== "divider");
    expect(values(false, "whiteboard")).toEqual(["edit", "rename", "preview", "download", "copy", "cut", "delete"]);
    expect(values(false, "image")).toEqual(["edit", "preview", "copy", "cut", "delete"]);
    expect(values(true, "whiteboard")).toEqual(["preview", "download", "copy"]);
    expect(values(false, "math")).toEqual(["edit", "copy", "cut", "delete"]);
  });
});
