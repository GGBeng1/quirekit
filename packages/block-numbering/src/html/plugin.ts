import type { Editor } from "@quirekit/core";
import { resolveWordNumberingMarkers } from "@quirekit/classic-numbering-model";
import { AddMarkStep, RemoveMarkStep, ReplaceStep, AttrStep, Decoration, DecorationSet, Plugin, PluginKey, type EditorState, type Node, type Transaction } from "@quirekit/pm";
import { createMarker, markerIndent, releaseMarker } from "./marker";
import type { ListPresentation } from "./types";

/** @param transaction - Accepted change. @returns Whether numbering structure and all references are unchanged. */
export function preservesNumberingStructure(transaction: Transaction): boolean {
  return transaction.steps.every((step, index) => {
    if (step instanceof AddMarkStep || step instanceof RemoveMarkStep) return true;
    // Stable block identities are appended after splits but do not change list presentation.
    if (step instanceof AttrStep && step.attr === "blockId") return true;
    if (!(step instanceof ReplaceStep) || step.slice.openStart || step.slice.openEnd) return false;
    const from = transaction.docs[index]!.resolve(step.from), to = transaction.docs[index]!.resolve(step.to);
    if (!from.sameParent(to) || !from.parent.isTextblock) return false;
    let inline = true;
    step.slice.content.forEach(node => { if (!node.isInline) inline = false; });
    return inline;
  });
}

/** @param doc - Accepted canonical document. @param editor - Owning session. @param readonly - Readonly presentation identity. @returns Derived marker widgets with no stored text. */
function decorations(doc: Node, editor: Editor, readonly = false): DecorationSet {
  const result: Decoration[] = [];
  for (const [position, marker] of resolveWordNumberingMarkers(doc)) {
    const node = doc.nodeAt(position);
    if (!node) continue;
    // Complex legacy wrappers retain their native marker until explicitly migrated.
    const resolved = doc.resolve(position);
    if (Array.from({ length: resolved.depth }, (_, index) => resolved.node(index + 1)).some(parent => ["bulletList", "orderedList"].includes(parent.type.name))) continue;
    const indent = markerIndent(marker);
    result.push(Decoration.node(position, position + node.nodeSize, {
      "data-block-list": marker.kind,
      "data-block-list-level": String(marker.level),
      style: `padding-inline-start:${indent.start}px;padding-inline-end:${indent.end}px;text-indent:0`
    }));
    result.push(Decoration.widget(position + 1, (view, getPos) => createMarker(view.dom.ownerDocument, editor, marker, getPos, readonly), {
      key: `block-list:${readonly ? "read" : "edit"}:${position}:${JSON.stringify(marker)}`, side: -1,
      stopEvent: () => true, ignoreSelection: true, destroy: releaseMarker
    }));
  }
  return DecorationSet.create(doc, result);
}

/** @param editor - Owning session. @returns Cached presentation; selection and inline edits never recompute counters. */
export function createListDecorations(editor: Editor): Plugin<ListPresentation> {
  const key = new PluginKey<ListPresentation>("blockListMarkers");
  return new Plugin({ key,
    state: {
      /** @param _config - Plugin configuration. @param state - Initial state. @returns Initial presentation. */
      init(_config, state) { return { editable: editor.isEditable, decorations: decorations(state.doc, editor, !editor.isEditable) }; },
      /** @param tr - Accepted change. @param previous - Retained presentation. @returns Mapped or freshly resolved markers. */
      apply(tr, previous) {
        const permission = tr.getMeta(key);
        if (typeof permission === "boolean" && permission !== previous.editable) {
          return { editable: permission, decorations: decorations(tr.doc, editor, !permission) };
        }
        if (!tr.docChanged) return previous;
        return { editable: previous.editable, decorations: preservesNumberingStructure(tr)
          ? previous.decorations.map(tr.mapping, tr.doc) : decorations(tr.doc, editor, !previous.editable) };
      }
    },
    /** @returns Permission changes enter the retained renderer through plugin state, never DOM writes. */
    view() {
      return {
        /** Emits at most one presentation-only transaction for a permission transition. */
        update() {
          if (key.getState(editor.state.pm)?.editable === editor.isEditable) return;
          editor.commands.command(({ tr, dispatch }) => {
            tr.setMeta(key, editor.isEditable).setMeta("addToHistory", false);
            dispatch?.(tr);
            return true;
          });
        }
      };
    },
    props: {
      /** @param state - Accepted state. @returns Retained marker decorations. */
      decorations(state: EditorState) { return key.getState(state)?.decorations ?? null; }
    }
  });
}
