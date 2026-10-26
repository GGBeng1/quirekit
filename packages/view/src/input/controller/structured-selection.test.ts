// @vitest-environment happy-dom
import { createEditor, Node, selectionPreset } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { createQuireSelectionStructureIntervalIndex, planQuireStructuredRange, QuireStructuredRangeSelection } from "@quirekit/view-engine";
import { canvasInternalClipboardMime } from "@quirekit/clipboard";
import { expect, it } from "vitest";
import { createQuireEditorInputController } from "../controller";
import { createQuireEditorInputBinding } from "../binding";

/** @returns A real mixed text/atom selection and its canonical input authority. */
function setup() {
  const atom = Node.create({ name: "fixtureAtom", group: "block", atom: true,
    /** @returns Portable fixture HTML. */
    renderHTML() { return ["hr"]; },
    /** @returns Shared whole-owner selection behavior. */
    addSelection() { return [selectionPreset.atomicBlock({ id: "fixture-atom", nodeTypes: [this.name] })]; }
  });
  const editor = createEditor({ extensions: [StarterKit, atom], content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "Alpha" }] }, { type: "fixtureAtom" },
    { type: "paragraph", content: [{ type: "text", text: "Beta" }] }, { type: "fixtureAtom" },
    { type: "paragraph", content: [{ type: "text", text: "Tail" }] }
  ] } });
  const structureIndex = createQuireSelectionStructureIntervalIndex({ doc: editor.state.doc, extensionManager: editor.extensionManager });
  editor.view.dispatch(editor.state.pm.tr.setSelection(QuireStructuredRangeSelection.create(editor.state.doc,
    planQuireStructuredRange({ anchor: 2, head: 15, structureIndex }))));
  const data = new Map<string, string>();
  const clipboardData = { getData: (type: string) => data.get(type) ?? "", setData: (type: string, value: string) => { data.set(type, value); } };
  return { editor, clipboardData, controller: createQuireEditorInputController({ editor }) };
}

it.each(["delete", "cut"])("%s routes the entire structured range with one-step undo", action => {
  const { editor, clipboardData, controller } = setup(), before = editor.state.doc;
  try {
    const result = action === "cut" ? controller.handleCut({ clipboardData }) : controller.handleKeyDown({ key: "Backspace" });
    expect(result).toMatchObject({ handled: true, docChanged: true });
    expect(editor.state.doc.textContent).toBe("ATail");
    expect(editor.getJSON().content?.some(node => node.type === "fixtureAtom")).toBe(false);
    if (action === "cut") expect(clipboardData.getData(canvasInternalClipboardMime)).toContain("fixtureAtom");
    editor.commands.undo(); expect(editor.state.doc.eq(before)).toBe(true);
  } finally { editor.destroy(); }
});

it("copies exact structural content and replaces all segments on paste", () => {
  const { editor, clipboardData, controller } = setup(), before = editor.state.doc;
  try {
    expect(controller.handleCopy({ clipboardData }).handled).toBe(true);
    const nodes = JSON.parse(clipboardData.getData(canvasInternalClipboardMime)).slice.content;
    expect(nodes.filter((node: { type: string }) => node.type === "fixtureAtom")).toHaveLength(2);
    clipboardData.setData(canvasInternalClipboardMime, "");
    clipboardData.setData("text/html", "");
    clipboardData.setData("text/plain", "Replacement");
    expect(controller.handlePaste({ clipboardData })).toMatchObject({ handled: true, docChanged: true });
    expect(editor.state.doc.textContent).toBe("AReplacementTail");
    editor.commands.undo(); expect(editor.state.doc.eq(before)).toBe(true);
  } finally { editor.destroy(); }
});

it("keeps a readonly structured range immutable at the mounted input boundary", () => {
  const { editor } = setup(), before = editor.state.doc;
  const inputProxy = document.createElement("textarea");
  const binding = createQuireEditorInputBinding({ editor, inputProxy });
  try {
    editor.setEditable(false);
    inputProxy.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", cancelable: true }));
    expect(editor.state.doc.eq(before)).toBe(true);
  } finally { binding.destroy(); editor.destroy(); }
});
