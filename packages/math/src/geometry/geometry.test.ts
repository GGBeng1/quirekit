import { describe, expect, it } from 'vitest';
import { projectMathGeometry } from './project';
import { hitMathGeometry, selectMathGeometry } from './hit';
import { getMathOverlay } from './overlay';
import { fitMathFontSize } from './fit';
import type { MathFormulaLayout } from '../output/layout/types';

const layout: MathFormulaLayout = {
  svg: '<svg/>', width: 4, height: 3, baseline: 2,
  slots: [
    { id: 'root', rect: { left: 0, top: 0, width: 4, height: 3 }, boundaries: [0, 2, 4], children: [{ left: 0, top: 0, width: 2, height: 3 }, { left: 2, top: 1, width: 2, height: 1 }] },
    { id: 'root/0/numerator', rect: { left: 0, top: 0, width: 2, height: 1 }, boundaries: [0, 1, 2], children: [{ left: 0, top: 0, width: 1, height: 1 }, { left: 1, top: 0, width: 1, height: 1 }], parent: { slot: 'root', index: 0 } },
    { id: 'root/0/denominator', rect: { left: 0.5, top: 2, width: 1, height: 1 }, children: [], boundaries: [0.5], emptyCenter: 1, parent: { slot: 'root', index: 0 } },
  ],
};

describe('consumer-owned math geometry', () => {
  it('projects numeric slots and overlays with an explicit surface origin and scale', () => {
    const geometry = projectMathGeometry(layout, { left: 17, top: 23, scaleX: 20, scaleY: 30 });
    const hit = hitMathGeometry(geometry, 38, 30);
    expect(hit).toEqual({ slot: 'root/0/numerator', index: 1 });
    const overlay = getMathOverlay(geometry, { anchor: { slot: hit.slot, index: 0 }, focus: { slot: hit.slot, index: 2 } });
    expect(overlay.active).toEqual({ left: 17, top: 23, width: 40, height: 30 });
    expect(overlay.selected).toHaveLength(2);
    expect(overlay.caret).toEqual({ left: 57, top: 23, width: 1, height: 30 });
    expect(getMathOverlay(geometry, { focus: { slot: 'root/0/denominator', index: 0 } }).caret?.left).toBe(37);
    expect(projectMathGeometry(layout, { left: 0, top: 0, scaleX: 0 })).toEqual([]);
  });

  it('promotes nested endpoints to an atomic enclosing child and never selects syntax fragments', () => {
    const geometry = projectMathGeometry(layout, { left: 0, top: 0, scaleX: 20 });
    expect(selectMathGeometry(geometry, { slot: 'root/0/numerator', index: 1 }, { slot: 'root/0/denominator', index: 0 }))
      .toEqual({ anchor: { slot: 'root', index: 0 }, focus: { slot: 'root', index: 1 } });
    expect(getMathOverlay([], { focus: { slot: 'root', index: 0 } })).toEqual({ selected: [] });
  });

  it('chooses the nearest of equally deep slots inside the hit tolerance', () => {
    const slot = (id: string, top: number) => ({ id, rect: { left: 0, top, width: 20, height: 10 }, children: [], boundaries: [10], parent: { slot: 'root', index: 0 } });
    const geometry = [{ id: 'root', rect: { left: 0, top: 0, width: 20, height: 22 }, children: [], boundaries: [0] }, slot('root/0/numerator', 0), slot('root/0/denominator', 12)];
    expect(hitMathGeometry(geometry, 10, 11.5).slot).toBe('root/0/denominator');
    expect(hitMathGeometry(geometry, 10, 10.4).slot).toBe('root/0/numerator');
  });

  it('shrinks a wide formula to its surface but never enlarges or goes below the minimum', () => {
    expect(fitMathFontSize(10, { available: 200, base: 28 })).toBe(20);
    expect(fitMathFontSize(2, { available: 200, base: 28 })).toBe(28);
    expect(fitMathFontSize(40, { available: 200, base: 28 })).toBe(12);
    expect(fitMathFontSize(40, { available: 200, base: 28, minimum: 4 })).toBe(5);
    expect(fitMathFontSize(0, { available: 200, base: 28 })).toBe(28);
  });
});
