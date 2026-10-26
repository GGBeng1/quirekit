import { describe, expect, it } from 'vitest';
import { equalImageCrop, fullImageCrop, isImageCrop, projectImageCrop, sourceImageCrop } from './geometry';
describe('non-destructive image crop geometry', () => {
  it('round trips insets through a viewport independently of source resolution', () => {
    const crop = { top: .1, right: .15, bottom: .2, left: .25 };
    const rect = projectImageCrop(crop, { width: 600, height: 400 });
    expect(rect).toEqual({ x: 150, y: 40, width: 360, height: 280 });
    expect(equalImageCrop(sourceImageCrop(rect.x * 4, rect.y * 4, (rect.x + rect.width) * 4,
      (rect.y + rect.height) * 4, { width: 2400, height: 1600 })!, crop)).toBe(true);
  });
  it('fits a ratio centered inside the existing region', () => {
    expect(projectImageCrop(fullImageCrop, { width: 600, height: 400 }, 1)).toEqual({ x: 100, y: 0, width: 400, height: 400 });
    expect(projectImageCrop(fullImageCrop, { width: 300, height: 600 }, 2)).toEqual({ x: 0, y: 225, width: 300, height: 150 });
  });
  it.each([NaN, Infinity, -.01, 1])('rejects invalid edge %s', left => {
    expect(isImageCrop({ ...fullImageCrop, left })).toBe(false);
  });
  it('rejects pairs of individually legal edges that leave no image', () => {
    expect(isImageCrop({ ...fullImageCrop, top: .6, bottom: .4 })).toBe(false);
    expect(sourceImageCrop(20, 0, 20, 100, { width: 100, height: 100 })).toBeNull();
  });
  it('removes harmless floating point noise at full source edges', () => {
    expect(sourceImageCrop(-1e-10, -1e-10, 100 + 1e-10, 100 + 1e-10, { width: 100, height: 100 })).toEqual(fullImageCrop);
  });
});
