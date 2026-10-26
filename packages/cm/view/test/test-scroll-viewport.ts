import { afterEach, expect, it, vi } from 'vitest';
import { EditorSelection } from '@quirekit/cm-state';
import { EditorView } from '../src/index';
import { ScrollTarget } from '../src/extension';

let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view?.dom.remove(); view = undefined; vi.restoreAllMocks(); });

for (const head of [0, 11]) it(`keeps the mounted navigation viewport until scrolling to ${head}`, () => {
  view = new EditorView({ parent: document.body, doc: 'first\n\nlast' });
  const state = view.viewState;
  state.scrollTarget = new ScrollTarget(EditorSelection.cursor(head), 'nearest', 'nearest', 5, 5);
  // A distant target is mounted while the physical viewport is still at the
  // departure point. Its old pixel bounds must not recrop the pending target.
  vi.spyOn(state, 'viewportIsAppropriate').mockReturnValue(false);
  const crop = vi.spyOn(state, 'getViewport');
  state.measure();
  expect(crop).not.toHaveBeenCalled();
  expect(state.scrollTarget.range.head).toBe(head);
  state.scrollTarget = null;
  vi.spyOn(view.contentDOM, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 100));
  state.measure();
  expect(crop).toHaveBeenCalledOnce();
});
