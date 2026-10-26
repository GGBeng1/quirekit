import { afterEach, expect, it } from 'vitest';
import { Compartment } from '@quirekit/cm-state';
import { Decoration, EditorView, WidgetType } from '../src/index';

let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view?.dom.remove(); view = undefined; });

it('locks document height before retiring a widget that can shrink the live DOM', () => {
  const slot = new Compartment(), heights: string[] = [];
  class Panel extends WidgetType {
    /** @returns A source replacement with its own host-managed content. */
    toDOM() { const dom = document.createElement('div'); dom.textContent = 'panel'; return dom; }
    /** @param dom - Retiring content that a component framework can immediately unmount. */
    destroy(dom: HTMLElement) { heights.push(view!.contentDOM.style.height); dom.replaceChildren(); }
  }
  view = new EditorView({ parent: document.body, doc: 'header\nbody', extensions: [slot.of(EditorView.decorations.of(
    Decoration.set([Decoration.replace({ widget: new Panel(), block: true }).range(0, 6)])))] });
  view.dispatch({ effects: slot.reconfigure([]) });
  expect(heights).toHaveLength(1);
  expect(heights[0]).not.toBe('');
  expect(view.contentDOM.style.height).toBe('');
});
