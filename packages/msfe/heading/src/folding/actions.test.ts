import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { codeFolding, ensureSyntaxTree, foldedRanges } from "@quirekit/cm-language";
import { TaskScope, type MsfeEditor, type MsfeViewStateUpdate } from "@quirekit/msfe-core";
import { toggleHeading } from "./actions";
import { headingFoldSnapshot, headingFoldSupport } from "./state";

/** @returns Accepted source and real native fold state, without a mounted DOM. */
function source(): EditorState {
  const state = EditorState.create({ doc: "# Title\n\nbody\n\n# Peer", extensions: [markdown(), codeFolding(),
    headingFoldSnapshot.extension, headingFoldSupport, EditorState.readOnly.of(true)] });
  ensureSyntaxTree(state, state.doc.length, 1000);
  return state.update({}).state;
}

/** @returns An owner recording view requests; text and fold semantics use real transactions. */
function owner() {
  let state = source();
  const scope = new TaskScope(), documentScope = scope.fork(), accepted: MsfeViewStateUpdate[] = [];
  const editor = { scope, documentScope, get state() { return state; },
    /** @param update - Requested native view action. @returns Acceptance from the test transaction owner. */
    updateViewState(update: MsfeViewStateUpdate) { accepted.push(update); state = state.update(update).state; return { ok: true }; },
  } as unknown as MsfeEditor;
  return { editor, accepted,
    /** @param next - Next canonical document/selection snapshot. */
    replace(next: EditorState): void { state = next; },
  };
}

describe("heading disclosure intent", () => {
  it("reads the current selection and permits a readonly view change without rewriting text", () => {
    const { editor, accepted, replace } = owner(), before = editor.state.doc, captured = headingFoldSnapshot.read(editor.state);
    replace(editor.state.update({ selection: { anchor: 10 } }).state);
    toggleHeading(editor, captured, 0);
    expect(accepted).toHaveLength(1);
    expect(editor.state.doc).toBe(before);
    expect(editor.state.selection.main.head).toBe(7);
    expect(foldedRanges(editor.state).size).toBe(1);
    toggleHeading(editor, headingFoldSnapshot.read(editor.state), 0);
    expect(foldedRanges(editor.state).size).toBe(0);
    editor.scope.dispose();
  });

  it("rejects stale text, replaced documents and retired document callbacks", () => {
    const { editor, accepted, replace } = owner(), captured = headingFoldSnapshot.read(editor.state);
    replace(editor.state.update({ changes: { from: 2, insert: "New " } }).state);
    toggleHeading(editor, captured, 0);
    replace(source());
    toggleHeading(editor, captured, 0);
    const current = headingFoldSnapshot.read(editor.state);
    editor.documentScope.dispose();
    toggleHeading(editor, current, 0);
    expect(accepted).toHaveLength(0);
    editor.scope.dispose();
  });

  it("does not replay a consumed fold intent against the next state", () => {
    const { editor, accepted } = owner(), captured = headingFoldSnapshot.read(editor.state);
    toggleHeading(editor, captured, 0); toggleHeading(editor, captured, 0);
    expect(accepted).toHaveLength(1);
    expect(foldedRanges(editor.state).size).toBe(1);
    editor.scope.dispose();
  });
});
