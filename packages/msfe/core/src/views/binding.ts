import { syntaxTree } from "@quirekit/cm-language";
import { EditorSelection, type EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";
import type { MsfeEditor, MsfeResult } from "../editor/types";
import type { MsfeNodeViewProps, MsfeNodeViewSpec, ViewRecord } from "./types";

/** @param spec - Feature codec. @param state - Current state. @param node - Confirmed syntax. @returns Bounded field fingerprint. */
export function sourceFingerprint(spec: MsfeNodeViewSpec, state: EditorState, node: SyntaxNode): string {
  return spec.source ? spec.source(state, node) : state.sliceDoc(node.from, node.to);
}

/** @param record - Mapped identity. @param expected - Captured fields. @returns Current matching syntax or rejection. */
function validate(record: ViewRecord, expected: string): SyntaxNode | null {
  if (!record.alive || record.source !== expected) return null;
  const state = record.view.state;
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(record.from, 1);
  while (node) {
    if (node.name === record.name && node.from === record.from && node.to === record.to) {
      return sourceFingerprint(record.spec, state, node) === expected ? node : null;
    }
    node = node.parent;
  }
  return null;
}

/**
 * Captures fields but resolves mapped positions lazily; obsolete callbacks never retarget.
 * @param record - Local syntax identity.
 * @param editor - Canonical transaction authority, available after mount.
 * @param live - Whether this specific renderer mount still exists.
 * @returns Framework-neutral attributes and guarded actions.
 */
export function bindingProps(record: ViewRecord, editor: () => MsfeEditor, live: () => boolean): MsfeNodeViewProps {
  const expected = record.source;
  /** @returns Current node for this exact semantic snapshot and mount. */
  function current(): SyntaxNode | null { return live() ? validate(record, expected) : null; }
  /** @returns An explicit stale rejection. */
  function stale(): MsfeResult { return { ok: false, reason: "stale-target" }; }
  return { id: record.id, attrs: record.attrs, readOnly: record.readOnly, status: "ready", resource: undefined,
    getRange() { const node = current(); return node ? { from: node.from, to: node.to } : null; },
    updateAttributes(patch) {
      const node = current();
      if (!node) return stale();
      return editor().run(state => {
        const changes = record.spec.patch(state, node, patch);
        return changes === null ? null : { changes };
      });
    },
    deleteNode() {
      const node = current();
      return node ? editor().run(() => ({ changes: { from: node.from, to: node.to } })) : stale();
    },
    revealSource() {
      const node = current();
      if (!node || record.view.state.readOnly) return false;
      editor().setSelection(EditorSelection.single(Math.min(node.from + 2, node.to)));
      editor().focus();
      return true;
    },
  };
}
