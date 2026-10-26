import { bindBlockNodeLocale, blockEditorText } from "../localization/node-view";
import { Decoration, DecorationSet, Plugin } from "@quirekit/pm";
import type { Node, EditorState } from "@quirekit/pm";
import type { QuireNodeViewRenderer, QuireViewMutationRecord } from "@quirekit/core";
import { readNotes } from "./query";
/** @param doc - Canonical document. @returns Numbering and explicit integrity status. */
function decorations(doc: Node): DecorationSet {
  return DecorationSet.create(doc, readNotes(doc).flatMap(note => [...note.references, ...note.definitions].map(item => {
    const status = !note.id || note.definitions.length !== 1 ? "引用失效" : !note.references.length ? "未引用" : "";
    return Decoration.node(item.from, item.to, { "data-note-number": note.number ? String(note.number) : "?", "data-note-status": status }, { noteNumber: note.number || "?" });
  })));
}
/** @returns Doc-dependent projection with no selection-time traversal. */
export function notePresentationPlugin(): Plugin<DecorationSet> {
  const plugin: Plugin<DecorationSet> = new Plugin({ state: {
    /** @param _config - Plugin configuration. @param state - Initial source. @returns Initial projection. */
    init: (_config, state) => decorations(state.doc),
    /** @param tr - Accepted transaction. @param previous - Prior projection. @returns Shared projection when only selection changes. */
    apply: (tr, previous) => tr.docChanged ? decorations(tr.doc) : previous
  }, props: { /** @param state - Current owner. @returns Cached presentation. */ decorations: (state: EditorState) => plugin.getState(state) ?? null } });
  return plugin;
}
/** Retains one editable definition body; reference markers and backlink controls are chrome. */
export const renderNote: QuireNodeViewRenderer = props => {
  const document = props.view.dom.ownerDocument, reference = props.node.type.name === "footnoteReference";
  const dom = document.createElement(reference ? "button" : "div");
  dom.className = reference ? "qk-block-note-reference" : "qk-block-note";
  const button = reference ? dom as HTMLButtonElement : document.createElement("button");
  button.type = "button"; button.contentEditable = "false";
  button.classList.add("qk-block-note-marker");
  let number = props.decorations.find(item => item.spec.noteNumber)?.spec.noteNumber ?? "?";
  /** Updates the accessible name from retained decoration metadata, without scanning the document. */
  function label(): void { button.setAttribute("aria-label", reference ? `${blockEditorText(props.editor, "脚注引用")} ${number}` : blockEditorText(props.editor, "返回脚注引用")); }
  const releaseLocale = bindBlockNodeLocale(props.editor, label);
  if (!reference) dom.append(button);
  const contentDOM = reference ? undefined : document.createElement("div");
  if (contentDOM) { contentDOM.className = "qk-block-note-body"; dom.append(contentDOM); }
  /** @param event - Explicit backlink/reference activation. */
  function navigate(event: Event): void {
    event.preventDefault(); event.stopPropagation();
    const position = props.getPos(), node = position === undefined ? null : props.editor.state.doc.nodeAt(position);
    if (node) props.editor.chain().navigateBlockFootnote(String(node.attrs.noteId), reference ? "definition" : "reference").focus(null, { scrollIntoView: false }).run();
  }
  button.addEventListener("click", navigate);
  return { dom, ...(contentDOM ? { contentDOM } : {}),
    /** @param node - Accepted source. @param decorations - Retained numbering metadata. @returns Whether the retained content owner survives. */
    update: (node: Node, decorations: readonly Decoration[]) => { if (node.type !== props.node.type) return false; number = decorations.find(item => item.spec.noteNumber)?.spec.noteNumber ?? "?"; label(); return true; },
    /** @param event - Native control event. @returns Whether chrome owns the event. */
    stopEvent: (event: Event) => event.target instanceof document.defaultView!.Node && button.contains(event.target),
    /** @param mutation - Native change. @returns Whether it belongs to noneditable chrome. */
    ignoreMutation: (mutation: QuireViewMutationRecord) => mutation.type !== "selection" && !contentDOM?.contains(mutation.target),
    /** Releases the control subscription. */
    destroy: () => { releaseLocale(); button.removeEventListener("click", navigate); }
  };
};
