import { expect, it } from 'vitest';
import { projectBreadcrumb } from './projection';

it('preserves ordered identity, the root and current item at every collapse boundary', () => {
  for (let length = 0; length < 20; length++) {
    for (const max of [undefined, NaN, Infinity, -1, 0, 2, 3, 4.8, 8, 30]) {
      const result = projectBreadcrumb(length, max);
      const restored = result.visible.flatMap(index => index === null ? result.hidden : [index]);
      expect(restored).toEqual(Array.from({ length }, (_, index) => index));
      if (result.hidden.length) {
        expect(result.visible[0]).toBe(0);
        expect(result.visible.at(-1)).toBe(length - 1);
        expect(result.visible.length).toBe(Math.max(3, Math.floor(max!)));
      } else expect(result.visible).not.toContain(null);
    }
  }
});
