import { expect, it } from "vitest";
import { flowchartImageSize } from "./size";
it("honors requested resolution when within budget", () => { expect(flowchartImageSize(300, 200, 2)).toEqual({ width: 600, height: 400, scale: 2, limited: false }); });
it("lowers large image resolution before allocating without violating either budget", () => {
  for (const [w, h] of [[4760, 6500], [10032, 10032], [2000032, 32], [32, 2000032]]) {
    const size = flowchartImageSize(w!, h!, 4); expect(size.limited).toBe(true); expect(size.width).toBeGreaterThan(0); expect(size.height).toBeGreaterThan(0);
    expect(size.width).toBeLessThanOrEqual(8192); expect(size.height).toBeLessThanOrEqual(8192); expect(size.width * size.height).toBeLessThanOrEqual(16e6);
  }
});
it("rejects invalid dimensions or requested scale", () => {
  for (const args of [[0, 100, 2], [NaN, 100, 2], [100, Infinity, 2], [100, 100, 0], [100, 100, 9]]) expect(() => flowchartImageSize(...args as [number, number, number])).toThrow();
});
