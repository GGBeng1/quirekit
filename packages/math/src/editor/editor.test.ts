import { describe, expect, it, vi } from 'vitest';
import { createMathEditor } from './create';
import { mathTemplates } from '../templates/catalog';
import * as parsing from '../latex/parse';
import * as indexing from '../visual/slots';

describe('headless formula editor', () => {
  it('performs no parsing, slot rebuilding or renderer work during external-store reads and selection', () => {
    const editor = createMathEditor({ latex: 'abc' });
    const parse = vi.spyOn(parsing, 'parseMathLatex'); const index = vi.spyOn(indexing, 'getMathVisualSlots');
    const before = editor.getSnapshot();
    for (let i = 0; i < 30; i++) { editor.getSnapshot(); editor.move(i % 2 ? 'right' : 'left'); }
    editor.setFocused(true); editor.setComposition(true, '候选'); editor.setComposition(false, '');
    expect(editor.getSnapshot().document).toBe(before.document);
    expect(editor.getSnapshot().slots).toBe(before.slots);
    expect(parse).not.toHaveBeenCalled(); expect(index).not.toHaveBeenCalled();
    parse.mockRestore(); index.mockRestore(); editor.destroy();
  });
  it('keeps a stable immutable snapshot and edits without a browser or renderer', () => {
    const editor = createMathEditor({ latex: '' });
    const initial = editor.getSnapshot();
    expect(editor.getSnapshot()).toBe(initial);
    expect(Object.isFrozen(initial)).toBe(true);
    const listener = vi.fn(); const unsubscribe = editor.subscribe(listener);
    editor.insertTemplate(mathTemplates.find(item => item.id === 'fraction')!);
    editor.insertText('ab'); editor.move('next'); editor.insertText('c');
    expect(editor.getSnapshot().draft).toBe(String.raw`\frac{ab}{c}`);
    const document = editor.getSnapshot().document;
    const calls = listener.mock.calls.length;
    editor.select(editor.getSnapshot().selection);
    expect(listener).toHaveBeenCalledTimes(calls);
    editor.move('home'); editor.move('right', true);
    expect(editor.getSnapshot().document).toBe(document);
    editor.undo(); expect(editor.getSnapshot().selection.focus.slot).toContain('denominator');
    editor.redo(); expect(editor.getSnapshot().draft).toBe(String.raw`\frac{ab}{c}`);
    unsubscribe(); editor.insertText('d'); expect(listener).toHaveBeenCalledTimes(calls + 4);
    editor.destroy(); editor.destroy();
    const disposed = editor.getSnapshot(); editor.insertText('x');
    expect(editor.getSnapshot()).toBe(disposed);
    expect(disposed.disposed).toBe(true);
  });

  it('retains exact source and the last valid preview, with safe source/selection history', () => {
    const editor = createMathEditor({ latex: String.raw`  \sqrt{x} ` });
    expect(editor.getSnapshot().draft).toBe(String.raw`  \sqrt{x} `);
    editor.select({ focus: { slot: 'root/0/radicand', index: 1 } });
    editor.insertText('y');
    const preview = editor.getSnapshot().document;
    editor.setLatex(String.raw`\unknown`);
    expect(editor.getSnapshot().document).toBe(preview);
    expect(editor.getSnapshot().canEdit).toBe(false);
    editor.undo(); expect(editor.getSnapshot().selection.focus).toEqual({ slot: 'root/0/radicand', index: 2 });
    editor.undo(); expect(editor.getSnapshot().draft).toBe(String.raw`  \sqrt{x} `);
    expect(editor.getSnapshot().selection.focus).toEqual({ slot: 'root/0/radicand', index: 1 });
    expect(editor.select({ focus: { slot: 'missing', index: 99 } })).toBe(false);
    expect(editor.select({ focus: { slot: 'root', index: 0 }, anchor: { slot: 'root/0/radicand', index: 0 } })).toBe(false);
  });

  it('supports discoverable keyboard intentions and refuses malformed visual text atomically', () => {
    const editor = createMathEditor({ latex: 'x' });
    expect(editor.handleKeyDown({ key: '\\' }).handled).toBe(true);
    expect(editor.getSnapshot().commandOpen).toBe(true);
    expect(editor.chooseCommand('square')).toBe(true);
    expect(editor.getSnapshot().draft).toBe('{x}^{2}');
    expect(editor.getSnapshot().commandOpen).toBe(false);
    editor.selectAll(); const selection = editor.getSnapshot().selection;
    expect(editor.insertText('\\bad')).toBe(false);
    expect(editor.getSnapshot().selection).toEqual(selection);
    expect(editor.getSnapshot().draft).toBe('{x}^{2}');
    editor.handleBeforeInput({ inputType: 'historyUndo' });
    expect(editor.getSnapshot().draft).toBe('x');
    editor.setComposition(true, '候选');
    expect(editor.handleKeyDown({ key: 'Backspace' }).handled).toBe(false);
    expect(editor.getSnapshot().draft).toBe('x');
    editor.setComposition(false, '');
    editor.destroy();
  });

  it('does not overwrite a conflicting host source with a late successful commit', async () => {
    let complete!: (value: boolean) => void;
    const editor = createMathEditor({ latex: 'x', commit: () => new Promise<boolean>(resolve => { complete = resolve; }) });
    editor.insertText('y'); const pending = editor.commit();
    expect(editor.getSnapshot().busy).toBe(true);
    expect(editor.insertText('z')).toBe(false);
    editor.syncHost('external'); complete(true);
    expect((await pending).status).toBe('conflict');
    expect(editor.getSnapshot().draft).toBe('xy');
    expect(editor.getSnapshot().conflict).toBe(true);
    expect(editor.reload()).toBe(true);
    expect(editor.getSnapshot().draft).toBe('external');
  });

  it('accepts the host acknowledgement, preserves failed drafts and ignores disposed completion', async () => {
    const editor = createMathEditor({ latex: 'x', commit: document => { editor.syncHost(document.latex); return true; } });
    editor.insertText('y'); expect((await editor.commit()).status).toBe('committed');
    expect(editor.getSnapshot().dirty).toBe(false);
    const rejected = createMathEditor({ latex: 'x', commit: () => false });
    rejected.insertText('y'); expect((await rejected.commit()).status).toBe('rejected');
    expect(rejected.getSnapshot().draft).toBe('xy');
    let complete!: (value: boolean) => void;
    const closing = createMathEditor({ latex: 'x', commit: () => new Promise<boolean>(resolve => { complete = resolve; }) });
    const pending = closing.commit(); closing.destroy(); const snapshot = closing.getSnapshot();
    expect(snapshot.busy).toBe(false);
    complete(true); expect((await pending).status).toBe('disposed');
    expect(closing.getSnapshot()).toBe(snapshot);
  });

  it('opens unsupported host source as a repairable invalid draft instead of throwing', () => {
    const editor = createMathEditor({ latex: String.raw`x+\unknown{y}` });
    const snapshot = editor.getSnapshot();
    expect(snapshot).toMatchObject({ draft: String.raw`x+\unknown{y}`, dirty: false, canEdit: false, feedback: 'unsupported-host', diagnostic: { code: 'unsupported-command', offset: 2 } });
    expect(editor.setLatex('x+y')).toBe(true);
    expect(editor.getSnapshot()).toMatchObject({ canEdit: true, dirty: true, feedback: undefined });
    editor.cancel();
    expect(editor.getSnapshot()).toMatchObject({ draft: String.raw`x+\unknown{y}`, feedback: 'unsupported-host' });
    editor.syncHost(String.raw`\alsoUnknown`);
    expect(editor.getSnapshot()).toMatchObject({ conflict: false, feedback: 'unsupported-host', draft: String.raw`\alsoUnknown` });
    editor.destroy();
  });

  it('gives typed text `^`, `_` and backslash the same meaning as the matching keys', () => {
    const editor = createMathEditor({ latex: 'x' });
    expect(editor.handleBeforeInput({ inputType: 'insertText', data: '_' }).handled).toBe(true);
    editor.handleBeforeInput({ inputType: 'insertText', data: '1' });
    editor.move('right');
    editor.handleBeforeInput({ inputType: 'insertText', data: '^' });
    editor.handleBeforeInput({ inputType: 'insertText', data: '2' });
    expect(editor.getSnapshot().draft).toBe('{x}_{1}^{2}');
    editor.handleBeforeInput({ inputType: 'insertText', data: '\\' });
    expect(editor.getSnapshot().commandOpen).toBe(true);
    editor.destroy();
  });
});
