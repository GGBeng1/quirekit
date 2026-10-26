import { afterEach, describe, expect, it } from 'vitest';
import { EditorState, StateEffect } from '@quirekit/cm-state';
import { BlockWrapper, Decoration, EditorView, WidgetType } from '../src/index';

/** A measured replacement, without relying on a particular DOM class name. */
class MeasuredBlock extends WidgetType {
  /** @returns A fixed-height widget used by the virtual layout fixture. */
  toDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.dataset.measured = 'true';
    dom.style.height = '80px';
    return dom;
  }
}

let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view?.dom.remove(); view = undefined; });

/** @param virtual - Whether the replacement is an internal viewport gap. @returns Mounted fixture. */
function fixture(virtual: boolean): EditorView {
  const doc = 'heading\nfirst\nsecond\nlast';
  return view = new EditorView({ parent: document.body, state: EditorState.create({ doc, extensions: [
    EditorView.blockWrappers.of(BlockWrapper.set([
      BlockWrapper.create({ tagName: 'section', attributes: { 'data-outer': 'true' } }).range(0, doc.length),
      BlockWrapper.create({ tagName: 'div', attributes: { 'data-inner': 'true' } }).range(0, 7),
    ], true)),
    EditorView.decorations.of(Decoration.set(Decoration.replace({
      widget: new MeasuredBlock(), block: true, inclusive: true, isBlockGap: virtual,
    }).range(0, 13))),
  ] }) });
}

describe('virtual block gap ownership', () => {
  it('keeps measured gaps outside nested wrappers even when their source spans the first wrapper', () => {
    const editor = fixture(true);
    const gap = editor.contentDOM.querySelector('[data-measured]')!;
    expect(gap.parentElement).toBe(editor.contentDOM);
    expect(editor.contentDOM.querySelector('[data-inner]')).toBeNull();
    expect(editor.contentDOM.querySelector('[data-outer]')?.textContent).toContain('second');
  });

  it('preserves root ownership when an unrelated update reuses the widget', () => {
    const editor = fixture(true);
    const gap = editor.contentDOM.querySelector('[data-measured]')!;
    editor.dispatch({ changes: { from: editor.state.doc.length, insert: '!' } });
    editor.dispatch({ selection: { anchor: 15 } });
    expect(editor.contentDOM.querySelector('[data-measured]')).toBe(gap);
    expect(gap.parentElement).toBe(editor.contentDOM);
    editor.dispatch({ effects: StateEffect.reconfigure.of([]) });
    expect(gap.isConnected).toBe(false);
    expect(editor.contentDOM.textContent).toContain('heading');
  });

  it('keeps ordinary replacement widgets inside their declared content wrappers', () => {
    const editor = fixture(false);
    expect(editor.contentDOM.querySelector('[data-measured]')?.parentElement?.hasAttribute('data-inner')).toBe(true);
  });

  it('applies vertical wrapper edges only at their real source boundaries and restores them after merging', () => {
    const doc = 'first\nhidden\nlast';
    const wrappers = EditorView.blockWrappers.of(BlockWrapper.set(BlockWrapper.create({ tagName: 'section',
      attributes: { style: 'padding:16px; margin:8px; border:1px solid black', 'data-fragment': 'true' },
    }).range(0, doc.length)));
    view = new EditorView({ parent: document.body, state: EditorState.create({ doc, extensions: [wrappers,
      EditorView.decorations.of(Decoration.set(Decoration.replace({
        widget: new MeasuredBlock(), block: true, inclusive: true, isBlockGap: true,
      }).range(6, 12))),
    ] }) });
    const fragments = [...view.contentDOM.querySelectorAll<HTMLElement>('[data-fragment]')];
    expect(fragments).toHaveLength(2);
    expect(getComputedStyle(fragments[0]!).paddingTop).toBe('16px');
    expect(getComputedStyle(fragments[0]!).paddingBottom).toBe('0px');
    expect(getComputedStyle(fragments[1]!).paddingTop).toBe('0px');
    expect(getComputedStyle(fragments[1]!).paddingBottom).toBe('16px');
    expect(getComputedStyle(fragments[0]!).marginBottom).toBe('0px');
    expect(getComputedStyle(fragments[1]!).borderTopWidth).toBe('0px');
    expect(getComputedStyle(fragments[1]!).paddingLeft).toBe('16px');
    view.dispatch({ effects: StateEffect.reconfigure.of(wrappers) });
    const merged = view.contentDOM.querySelector<HTMLElement>('[data-fragment]')!;
    expect(view.contentDOM.querySelectorAll('[data-fragment]')).toHaveLength(1);
    expect(merged.textContent).toContain('hidden');
    expect(getComputedStyle(merged).paddingTop).toBe('16px');
    expect(getComputedStyle(merged).paddingBottom).toBe('16px');
  });
});
