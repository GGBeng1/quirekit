// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { NodeSelection } from "@quirekit/pm";
import type { QuireNodeViewRendererProps } from "@quirekit/core";
import { createBlockEditor } from "../runtime/create";
import { createRichContentSurface } from "./surface";

it("selects a card once while keeping controls, readonly input and disposal independent", () => {
  const instance = createBlockEditor({ content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "正文" }] },
    { type: "webCard", attrs: { url: "https://example.com", title: "资料" } }
  ] } });
  const editor = instance.editor, root = document.createElement("div"), focus = vi.fn();
  editor.commands.setTextSelection(1);
  const position = editor.state.doc.firstChild!.nodeSize, node = editor.state.doc.nodeAt(position)!;
  const view = createRichContentSurface({ editor, node, getPos: () => position, view: { dom: root, focus } } as unknown as QuireNodeViewRendererProps, vi.fn(), vi.fn());
  const title = document.createElement("span"), control = document.createElement("button");
  view.portal.append(title, control); root.append(view.dom); document.body.append(root);
  const documentBefore = editor.state.doc, undoBefore = editor.can().undo(), transaction = vi.fn(); editor.on("transaction", transaction);
  try {
    const press = new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 });
    title.dispatchEvent(press);
    expect(editor.state.pm.selection).toBeInstanceOf(NodeSelection);
    expect(editor.state.pm.selection.from).toBe(position); expect(press.defaultPrevented).toBe(true);
    expect(view.stopEvent(press)).toBe(true); expect(focus).toHaveBeenCalledOnce();
    transaction.mockClear(); title.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    expect(transaction).not.toHaveBeenCalled();
    editor.commands.setTextSelection(1); focus.mockClear();
    const click = vi.fn(); control.addEventListener("click", click);
    const controlPress = new PointerEvent("pointerdown", { bubbles: true, cancelable: true });
    control.dispatchEvent(controlPress); control.click();
    expect(editor.state.pm.selection.from).toBe(position); expect(controlPress.defaultPrevented).toBe(false);
    expect(focus).not.toHaveBeenCalled(); expect(click).toHaveBeenCalledOnce();
    editor.commands.setTextSelection(1); editor.setEditable(false);
    const selection = editor.state.pm.selection;
    title.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    expect(editor.state.pm.selection).toBe(selection); expect(editor.state.doc).toBe(documentBefore);
    expect(editor.can().undo()).toBe(undoBefore);
    editor.setEditable(true); view.destroy();
    title.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    expect(editor.state.pm.selection).toBe(selection);
  } finally { view.destroy(); instance.destroy(); root.remove(); }
});
