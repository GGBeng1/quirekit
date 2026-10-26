// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { captureAnchors, restoreAnchor } from './anchors';

it('preserves the visible key after prepend, growing media and deletion with bounded reads', () => {
  const viewport = document.createElement('div'); viewport.scrollTop = 5100;
  vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);
  const keys = Array.from({ length: 1000 }, (_, index) => String(index));
  let growth = 0;
  const reads = vi.fn();
  const nodes = new Map(keys.map((key, index) => {
    const element = document.createElement('div');
    vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => {
      reads(); return { top: index * 100 + growth - viewport.scrollTop + 100, bottom: (index + 1) * 100 + growth - viewport.scrollTop + 100 } as DOMRect;
    });
    return [key, element] as const;
  }));
  const anchors = captureAnchors(keys, nodes, viewport);
  expect(anchors[0]?.key).toBe('51'); expect(reads.mock.calls.length).toBeLessThan(18);
  growth = 230;
  restoreAnchor(anchors, nodes, viewport); expect(viewport.scrollTop).toBe(5330);
  nodes.delete('51'); growth = 330;
  restoreAnchor(anchors, nodes, viewport); expect(viewport.scrollTop).toBe(5430);
  restoreAnchor(anchors, new Map(), viewport); expect(viewport.scrollTop).toBe(5430);
});
