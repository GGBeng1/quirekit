import { afterEach, expect, it } from "vitest";
import { horizontalRulePresets } from "@quirekit/extension-horizontal-rule";
import { createBlockEditor, type BlockEditorInstance } from "../runtime";
import { captureBlockRule, changeBlockRule } from "./commands";
const instances: BlockEditorInstance[] = [];
afterEach(() => { for (const instance of instances.splice(0)) instance.destroy(); });
/** @returns A two-rule document for exact-target and independent history validation. */
function setup() {
  const instance = createBlockEditor({ content: { type: "doc", content: [{ type: "horizontalRule" }, { type: "horizontalRule" }, { type: "paragraph" }] } });
  instances.push(instance); instance.editor.commands.setNodeSelection(0); return instance.editor;
}
it("updates with shared presets and deletes through independently undoable canonical commands", () => {
  const editor = setup(), original = editor.getJSON();
  expect(changeBlockRule(editor, captureBlockRule(editor)!, horizontalRulePresets.find(preset => preset.id === "double")!.style)).toBe(true);
  expect(editor.state.doc.firstChild?.attrs.variant).toBe("double");
  expect(editor.state.doc.child(1).attrs.variant).toBe("single");
  const styled = editor.getJSON();
  expect(changeBlockRule(editor, captureBlockRule(editor)!, null)).toBe(true);
  expect(editor.state.doc.childCount).toBe(2);
  editor.commands.undo(); expect(editor.getJSON()).toEqual(styled);
  editor.commands.undo(); expect(editor.getJSON()).toEqual(original);
});
it("rejects stale document, changed selection and readonly edits", () => {
  const editor = setup(), original = captureBlockRule(editor)!;
  editor.commands.setNodeSelection(1);
  expect(changeBlockRule(editor, original, { color: "#dc2626" })).toBe(false);
  editor.commands.setNodeSelection(0);
  expect(changeBlockRule(editor, original, { widthPercent: 50 })).toBe(true);
  expect(changeBlockRule(editor, original, null)).toBe(false);
  const current = captureBlockRule(editor)!; editor.setEditable(false);
  expect(changeBlockRule(editor, current, null)).toBe(false);
});
it("honors inherited rule options and the StarterKit opt-out", () => {
  const custom = createBlockEditor({ preset: { starterKit: { horizontalRule: { HTMLAttributes: { class: "custom-rule" }, nextNodeType: "heading" } } } });
  const disabled = createBlockEditor({ preset: { starterKit: { horizontalRule: false } } });
  instances.push(custom, disabled);
  expect(custom.editor.extensions.filter(extension => extension.name === "horizontalRule")).toHaveLength(1);
  expect(custom.editor.extensions.find(extension => extension.name === "horizontalRule")?.options).toMatchObject({ HTMLAttributes: { class: "custom-rule" }, nextNodeType: "heading" });
  expect(disabled.editor.state.schema.nodes.horizontalRule).toBeUndefined();
});
