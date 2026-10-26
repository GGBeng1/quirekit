import { expect, it, vi } from 'vitest';
import { EditorSelection, EditorState } from '@quirekit/cm-state';
import type { EditorView } from '../src/editorview';
import { Decoration } from '../src/decoration';
import { skipAtoms, skipAtomsForSelection } from '../src/cursor';

/** @param lastVisible - Whether the last row owns an editable line box. @param doc - Canonical lines. @returns Mounted line geometry independent of phantom text rectangles. */
function fixture(lastVisible = true, doc = 'one\nend\n\ntwo') {
  const state = EditorState.create({ doc });
  const lineAt = vi.fn((position: number) => {
    const line = state.doc.lineAt(position), visible = line.number === 1 || lastVisible && line.number === 4;
    return { posAtStart: line.from, posAtEnd: line.to, dom: { getBoundingClientRect: () => ({ height: visible ? 20 : 0 }) } };
  });
  return { view: { state, docView: { lineAt } } as unknown as EditorView, lineAt };
}

it('skips adjacent zero-height source rows in either navigation direction', () => {
  const { view, lineAt } = fixture();
  expect(skipAtoms(view, EditorSelection.cursor(3), EditorSelection.cursor(4)).head).toBe(9);
  expect(lineAt).toHaveBeenCalledTimes(3);
  lineAt.mockClear();
  expect(skipAtoms(view, EditorSelection.cursor(9), EditorSelection.cursor(8)).head).toBe(3);
  expect(lineAt).toHaveBeenCalledTimes(3);
});

it('retains the visible origin when no later mounted row can own the caret', () => {
  const { view } = fixture(false);
  expect(skipAtoms(view, EditorSelection.cursor(3), EditorSelection.cursor(4)).head).toBe(3);
});

it('checks only the candidate row for ordinary text motion and keeps its goal column', () => {
  const { view, lineAt } = fixture(), candidate = EditorSelection.cursor(2, 1, undefined, 15);
  expect(skipAtoms(view, EditorSelection.cursor(1), candidate)).toBe(candidate);
  expect(lineAt).toHaveBeenCalledTimes(1);
  expect(skipAtoms(view, EditorSelection.cursor(3), EditorSelection.cursor(4, 1, undefined, 15)).goalColumn).toBe(15);
});

it('moves pointer hits off a zero-height fence adjacent to a whitespace separator atom', () => {
  const { view } = fixture(true, 'one\nend\n  \ntwo');
  const atoms = [Decoration.set([Decoration.replace({}).range(7, 11)])];
  expect(skipAtomsForSelection(atoms, EditorSelection.single(8), view).main.head).toBe(3);
  expect(skipAtomsForSelection(atoms, EditorSelection.single(10), view).main.head).toBe(11);
});

it('keeps directed and undirectional pointer ranges outside collapsed rows', () => {
  const { view } = fixture(true, 'one\nend\n  \ntwo');
  const atoms = [Decoration.set([Decoration.replace({}).range(7, 11)])];
  expect(skipAtomsForSelection(atoms, EditorSelection.single(8, 1), view).main.toJSON()).toEqual({ anchor: 11, head: 1 });
  const range = EditorSelection.create([EditorSelection.undirectionalRange(8, 9)]);
  expect(skipAtomsForSelection(atoms, range, view).main.toJSON()).toEqual({ anchor: 3, head: 11 });
});
