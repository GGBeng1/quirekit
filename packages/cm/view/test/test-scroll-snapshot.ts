import { afterEach, expect, it, vi } from 'vitest';
import { EditorView } from '../src/index';
import { BlockInfo } from '../src/heightmap';
import { BlockType } from '../src/decoration';

let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view?.dom.remove(); view = undefined; vi.restoreAllMocks(); });

for (const outer of ['window', 'element'] as const) it(`uses the measured source anchor for an outer ${outer} scroller without measuring on snapshot capture`, () => {
  view = new EditorView({ parent: document.body, doc: 'first\nvisible\nlast' });
  const parent = outer === 'element' ? document.createElement('div') : null;
  view.viewState.scrollParent = parent; view.viewState.scrollOffset = 1000;
  if (parent) parent.scrollTop = 900;
  else vi.spyOn(window, 'scrollY', 'get').mockReturnValue(900);
  const anchor = vi.spyOn(view.viewState, 'scrollAnchorAt').mockReturnValue(new BlockInfo(6, 7, 1200, 20, BlockType.Text));
  const geometry = vi.spyOn(Element.prototype, 'getBoundingClientRect'), scroll = vi.spyOn(window, 'scrollTo');
  const snapshot = view.scrollSnapshot();
  expect(anchor).toHaveBeenCalledWith(1000); expect(snapshot.value.range.head).toBe(6);
  expect(geometry).not.toHaveBeenCalled();
  vi.spyOn(view.viewState, 'lineBlockAt').mockReturnValue(new BlockInfo(6, 7, 1300, 20, BlockType.Text));
  view.docView.scrollIntoView(snapshot.value);
  if (parent) expect(parent.scrollTop).toBe(1000);
  else expect(scroll).toHaveBeenCalledWith(0, 1000);
});
