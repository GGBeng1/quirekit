import { expect, it } from "vitest";
import { OverviewBoundsIndex } from "./bounds";
it("tracks negative extrema, replacement, removal and slot reuse", () => {
  const index = new OverviewBoundsIndex();
  index.set("a", { x: -100, y: -50, width: 20, height: 30 }); index.set("b", { x: 200, y: 80, width: 60, height: 40 });
  expect(index.bounds()).toEqual({ x: -100, y: -50, width: 360, height: 170 });
  index.set("b", { x: -70, y: -20, width: 10, height: 10 }); expect(index.bounds()).toEqual({ x: -100, y: -50, width: 40, height: 40 });
  index.remove("a"); expect(index.bounds()).toEqual({ x: -70, y: -20, width: 10, height: 10 });
  index.remove("b"); expect(index.bounds()).toBeUndefined();
  index.set("c", { x: 5, y: 5, width: 20, height: 20 }); expect(index.bounds()).toEqual({ x: 5, y: 5, width: 20, height: 20 });
});
it("keeps exact bounds after growing and shrinking a thousand-node index", () => {
  const index = new OverviewBoundsIndex();
  for (let i = 0; i < 1000; i++) index.set(String(i), { x: i * 3 - 400, y: i, width: 20, height: 30 });
  for (let i = 1; i < 999; i++) index.remove(String(i));
  expect(index.bounds()).toEqual({ x: -400, y: 0, width: 3017, height: 1029 });
  index.remove("999"); expect(index.bounds()).toEqual({ x: -400, y: 0, width: 20, height: 30 });
});
