import { afterEach, expect, it } from 'vitest';
import { scrollableParents } from '../src/dom';

let root: HTMLElement | undefined;
afterEach(() => { root?.remove(); root = undefined; });

/** @param parent - Fixture parent. @param overflow - CSS scrolling contract. @param horizontal - Whether content also exceeds the width. @returns An overflowing ancestor with deterministic dimensions. */
function box(parent: HTMLElement, overflow: string, horizontal = true): HTMLElement {
  const element = parent.appendChild(document.createElement('div'));
  element.style.overflowX = element.style.overflowY = overflow;
  Object.defineProperties(element, {
    clientHeight: { value: 100 }, scrollHeight: { value: 300 },
    clientWidth: { value: 100 }, scrollWidth: { value: horizontal ? 300 : 100 },
  });
  return element;
}

for (const overflow of ['visible', 'clip']) it(`ignores ${overflow} overflow while finding the real outer scroller`, () => {
  root = box(document.body, 'auto');
  const decorationHost = box(root, overflow), content = decorationHost.appendChild(document.createElement('div'));
  expect(scrollableParents(content)).toEqual({ x: root, y: root });
  expect(scrollableParents(content, false)).toEqual({ x: null, y: root });
});

it('falls back to the page when overflowing decorations have no scrollable ancestor', () => {
  root = box(document.body, 'visible');
  const content = root.appendChild(document.createElement('div'));
  expect(scrollableParents(content)).toEqual({ x: null, y: null });
});

it('keeps hidden overflow programmatically scrollable and resolves each axis independently', () => {
  root = box(document.body, 'scroll');
  const inner = box(root, 'hidden'), content = inner.appendChild(document.createElement('div'));
  expect(scrollableParents(content)).toEqual({ x: inner, y: inner });
  const vertical = box(inner, 'auto', false), nested = vertical.appendChild(document.createElement('div'));
  expect(scrollableParents(nested)).toEqual({ x: inner, y: vertical });
});
