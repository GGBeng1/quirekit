import { Extension, Node, selectionPreset } from "@quirekit/core";
import { NodeSelection } from "@quirekit/pm";
import { noteCommands } from "./commands";
import { noteIdentityPlugin } from "./identity";
import { notePresentationPlugin, renderNote } from "./presentation";
/** @param reference - Inline reference or editable definition. @returns Canonical note end with a stable association. */
function noteNode(reference: boolean) {
  return Node.create({
    name: reference ? "footnoteReference" : "footnoteDefinition", group: reference ? "inline" : "block", inline: reference, atom: reference,
    ...(reference ? {} : { content: "paragraph+", defining: true, isolating: true }),
    /** @returns Persistent association with HTML round-trip fields. */
    addAttributes: () => ({ noteId: { default: "", parseHTML: element => element.getAttribute("data-note-id") ?? "", renderHTML: attrs => ({ "data-note-id": attrs.noteId }) } }),
    /** @returns Source-only import rules. */
    // DOMParser orders mark rules before node rules of equal priority.
    parseHTML: () => [{ tag: `${reference ? "sup" : "aside"}[data-qk-footnote]`, priority: 100 }],
    /** @param context - Canonical attribute projection. @returns Portable source markup without transient numbering. */
    renderHTML: ({ HTMLAttributes }) => reference ? ["sup", { ...HTMLAttributes, "data-qk-footnote": "reference" }, "[注]"] : ["aside", { ...HTMLAttributes, "data-qk-footnote": "definition" }, 0],
    ...(reference ? {
      /** @returns Plain-text reference marker. */
      renderText: () => "[脚注]",
      /** @returns Shared inline atom selection ownership. */
      addSelection: () => [selectionPreset.inline({ id: "footnoteReference", nodeTypes: ["footnoteReference"] })]
    } : {}),
    /** @returns The single retained source view. */
    addNodeView: () => renderNote
  });
}
/** Source-linked notes for continuous documents, independent of paginated Word footnotes. */
export const BlockFootnotes = Extension.create({
  name: "blockFootnotes", keyboardShortcutPriority: 200,
  /** @returns Both canonical ends of a note. */
  addExtensions: () => [noteNode(true), noteNode(false)],
  /** @returns Typed mutations and navigation. */
  addCommands: noteCommands,
  /** @returns Identity and presentation projections of the same source. */
  addProseMirrorPlugins: () => [noteIdentityPlugin(), notePresentationPlugin()],
  /** @returns Keyboard activation of the selected reference. */
  addKeyboardShortcuts() { return { Enter: () => {
    const selection = this.editor?.state.pm.selection;
    return selection instanceof NodeSelection && selection.node.type.name === "footnoteReference"
      ? this.editor!.commands.navigateBlockFootnote(selection.node.attrs.noteId, "definition") : false;
  } }; },
  /** @returns Contextual lifecycle operations for a clicked note. */
  addBlockMenuProviders: () => [{ id: "footnotes", getItems: ({ editor, block }) => block.node.type.name === "footnoteDefinition" ? [
    { value: "reference", label: "定位正文引用", icon: "arrowUpLeft", run: () => editor.commands.navigateBlockFootnote(block.node.attrs.noteId, "reference") }
  ] : [] }]
});
