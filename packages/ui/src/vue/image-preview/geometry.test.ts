import { effectScope, nextTick, ref } from 'vue';
import { expect, it } from 'vitest';
import { anchoredPan, clampPan, fitScale, rotatedSize } from './geometry';
import { useImageTransform } from './use-transform';

it('fits portrait, landscape, rotated and small images without cropping or upscaling', () => {
  const viewport = { width: 800, height: 600 };
  expect(fitScale({ width: 2000, height: 1000 }, viewport)).toBe(.4);
  expect(fitScale({ width: 400, height: 1600 }, viewport)).toBe(.375);
  expect(fitScale({ width: 100, height: 100 }, viewport)).toBe(1);
  expect(rotatedSize({ width: 2000, height: 1000 }, 90)).toEqual({ width: 1000, height: 2000 });
  expect(fitScale(rotatedSize({ width: 2000, height: 1000 }, 270), viewport)).toBe(.3);
});
it('anchors zoom under the pointer and keeps the image recoverable at every boundary', () => {
  const center = anchoredPan({ x: 10, y: 20 }, { x: 100, y: 50 }, 2);
  expect(center).toEqual({ x: -80, y: -10 });
  expect(clampPan({ x: 900, y: -900 }, { width: 2000, height: 1000 }, { width: 800, height: 600 }, .5)).toEqual({ x: 100, y: 0 });
});
it('preserves fit on resize, clamps zoomed pan, rotates and resets on a new resource', async () => {
  const scope = effectScope();
  const viewport = ref({ width: 800, height: 600 });
  const api = scope.run(() => useImageTransform(viewport))!;
  api.load({ width: 2000, height: 1000 }); expect(api.scale.value).toBe(.4);
  viewport.value = { width: 400, height: 600 }; await nextTick(); expect(api.scale.value).toBe(.2);
  api.actual(); expect(api.scale.value).toBe(1);
  api.panTo({ x: 9000, y: -9000 }); expect(api.offset.value).toEqual({ x: 800, y: -200 });
  api.rotate(); expect(api.angle.value).toBe(90); expect(api.scale.value).toBe(.3);
  api.rotate(-1); expect(api.angle.value).toBe(0); expect(api.scale.value).toBe(.2);
  api.zoomTo(100); expect(api.scale.value).toBe(8);
  api.load({ width: 200, height: 200 }); expect(api.scale.value).toBe(1); expect(api.angle.value).toBe(0); expect(api.offset.value).toEqual({ x: 0, y: 0 });
  scope.stop();
});
it('allows shrinking below fit and preserves manual zoom when the viewport changes', () => {
  const scope = effectScope();
  const viewport = ref({ width: 800, height: 600 });
  const api = scope.run(() => useImageTransform(viewport))!;
  api.load({ width: 2000, height: 1000 });
  api.zoomBy(.8); expect(api.scale.value).toBeCloseTo(.32);
  viewport.value = { width: 1000, height: 800 }; expect(api.scale.value).toBeCloseTo(.32);
  api.zoomTo(0); expect(api.scale.value).toBe(.1);
  api.fit(); expect(api.scale.value).toBe(.5);
  api.load({ width: 40000, height: 20000 });
  const fitted = api.scale.value;
  api.zoomBy(.8); expect(api.scale.value).toBeCloseTo(fitted * .8);
  scope.stop();
});
