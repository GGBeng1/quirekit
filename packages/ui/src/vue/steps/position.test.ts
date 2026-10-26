import { describe, it, expect } from 'vitest';
import { normalizeStep } from './position';
describe('external process positions',()=>{
  it('projects shrinking data, negative and nonfinite input to a valid position',()=>{
    expect(normalizeStep(4,2)).toBe(2);
    expect(normalizeStep(-1,3)).toBe(0);
    expect(normalizeStep(Number.NaN,3)).toBe(0);
    expect(normalizeStep(Infinity,3)).toBe(0);
    expect(normalizeStep(2.8,3)).toBe(2);
    expect(normalizeStep(3,0)).toBe(0);
  });
});
