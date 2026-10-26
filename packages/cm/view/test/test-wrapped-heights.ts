import { afterEach, expect, it, vi } from 'vitest';
import { EditorState } from '@quirekit/cm-state';
import { BlockWrapper, EditorView } from '../src/index';

let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view?.dom.remove(); view = undefined; vi.restoreAllMocks(); });

/** @param element - Measured element. @param top - Client top. @param height - Border-box height. */
function bounds(element: Element, top: number, height: number): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, top, 500, height));
}

it('measures each wrapper identically in a full viewport and an isolated selection viewport', () => {
  const doc = 'first\nhidden\nlast';
  view = new EditorView({ parent: document.body, state: EditorState.create({ doc, extensions: [
    EditorView.blockWrappers.of(BlockWrapper.set([[0, 5], [6, 12], [13, 17]].map(([from, to]) =>
      BlockWrapper.create({ tagName: 'section', attributes: { 'data-offset': String(from) } }).range(from!, to!)))),
  ] }) });
  view.viewState.paddingTop = 0;
  bounds(view.contentDOM, 0, 144);
  for (const [index, wrapper] of [...view.contentDOM.querySelectorAll('section')].entries()) {
    bounds(wrapper, 8 + index * 48, 40);
    bounds(wrapper.querySelector('.cm-line')!, 16 + index * 48, 20);
  }
  // Every box has 8px preceding margin, 8px top padding, 20px text and
  // 12px bottom padding. Skipping earlier wrappers must not move that padding.
  expect(view.docView.measureVisibleLineHeights({ from: 0, to: 17 })).toEqual([-16, 48, -16, 48, -16, 48]);
  expect(view.docView.measureVisibleLineHeights({ from: 13, to: 17 })).toEqual([-16, 48]);
});
