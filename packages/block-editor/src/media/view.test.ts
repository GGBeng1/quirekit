// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import type { QuireNodeViewRendererProps } from "@quirekit/core";
import { createBlockEditor } from "../runtime/create";
import { wrapMediaView } from "./view";
import { registerBlockMediaPreview } from "./preview";

it("inherits a preview's bounded size but lets explicit document geometry override it", () => {
  const instance = createBlockEditor({ content: "<p>正文</p>" });
  const root = document.createElement("div"), preview = document.createElement("figure");
  const image = document.createElement("img"); preview.append(image);
  /** @returns Acceptance after reprojecting the source-owned portrait preview. */
  function update(): boolean { preview.style.cssText = "width:100%;max-width:230px;aspect-ratio:1/2"; return true; }
  update();
  const type = instance.editor.schema.nodes.image!;
  const node = type.create({ src: "https://example.test/portrait.png" });
  const view = wrapMediaView({ editor: instance.editor, node, getPos: () => 0, view: { dom: root, focus: vi.fn() } } as unknown as QuireNodeViewRendererProps, { dom: preview, update });
  try {
    const shell = view.dom as HTMLElement;
    expect(shell.style.maxWidth).toBe("min(100%, 230px)");
    view.update!(type.create({ ...node.attrs, media: { width: 400, height: 800 } }), [], undefined as never);
    expect(shell.style.width).toBe("400px"); expect(shell.style.maxWidth).toBe("100%");
    view.update!(node, [], undefined as never);
    expect(shell.style.maxWidth).toBe("min(100%, 230px)");
    expect(preview.style.aspectRatio).toBe("1 / 2");
  } finally { view.destroy?.(); instance.destroy(); }
});

it("opens ordinary images on double click and reading media on click without selecting", () => {
  const instance = createBlockEditor({ content: { type: "doc", content: [{ type: "image", attrs: { src: "https://example.test/image.png" } }] } });
  const editor = instance.editor, root = document.createElement("div"), image = document.createElement("img");
  const open = vi.fn(), focus = vi.fn(), release = registerBlockMediaPreview(editor, open);
  const view = wrapMediaView({ editor, node: editor.state.doc.firstChild!, getPos: () => 0,
    view: { dom: root, focus } } as unknown as QuireNodeViewRendererProps, { dom: image });
  root.append(view.dom); document.body.append(root);
  try {
    image.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(open).not.toHaveBeenCalled();
    image.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    expect(open).toHaveBeenCalledExactlyOnceWith(0);
    editor.setEditable(false);
    const selection = editor.state.pm.selection, doc = editor.state.doc;
    image.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 }));
    image.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(open).toHaveBeenCalledTimes(2);
    expect(editor.state.pm.selection).toBe(selection); expect(editor.state.doc).toBe(doc);
    expect(focus).not.toHaveBeenCalled();
    (view.dom as HTMLElement).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(open).toHaveBeenCalledTimes(3);
    release();
    image.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(open).toHaveBeenCalledTimes(3);
  } finally { release(); view.destroy?.(); instance.destroy(); root.remove(); }
});

it("owns preview selection once while keeping native double clicks, controls and shifted range selection", () => {
  const instance = createBlockEditor({ content: "<p>正文</p>" });
  const root = document.createElement("div"), preview = document.createElement("figure");
  const image = document.createElement("img"), control = document.createElement("button");
  preview.append(image, control);
  const focus = vi.fn(), genericPointer = vi.fn(), activate = vi.fn();
  preview.addEventListener("dblclick", activate);
  const view = wrapMediaView({ editor: instance.editor, node: instance.editor.state.doc.firstChild!,
    getPos: () => 0, view: { dom: root, focus } } as unknown as QuireNodeViewRendererProps,
  { dom: preview, stopEvent: event => event.type === "dblclick" });
  root.append(view.dom); document.body.append(root);
  root.addEventListener("pointerdown", event => { if (!view.stopEvent?.(event)) genericPointer(); });
  try {
    image.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 }));
    expect(focus).toHaveBeenCalledOnce();
    expect(genericPointer).not.toHaveBeenCalled();
    image.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(activate).toHaveBeenCalledOnce();
    image.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, shiftKey: true }));
    expect(genericPointer).toHaveBeenCalledOnce();
    control.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 }));
    expect(focus).toHaveBeenCalledOnce();
  } finally { view.destroy?.(); instance.destroy(); root.remove(); }
});
