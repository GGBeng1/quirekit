import { expect, it } from "vitest";
import { chooseLabelPlacement, createLabelObstacles } from "./placement";

it("keeps an unobstructed current placement and resolves colliding labels deterministically", () => {
  const existing = { distance: 0.5, offset: 12, box: { x: 20, y: 10, width: 40, height: 20 } };
  const alternative = { distance: 0.35, offset: -28, box: { x: 20, y: -40, width: 40, height: 20 } };
  const obstacles = createLabelObstacles([]);
  expect(chooseLabelPlacement([existing, alternative], obstacles)).toBe(existing);
  obstacles.add(existing.box);
  expect(chooseLabelPlacement([existing, alternative], obstacles)).toBe(alternative);
  obstacles.add(alternative.box);
  expect(chooseLabelPlacement([existing, alternative], obstacles)).toBe(existing);
});
it("handles negative coordinates and very large obstacles without enumerating unbounded buckets", () => {
  const obstacles = createLabelObstacles([{ x: -4e6, y: -4e6, width: 8e6, height: 8e6 }]);
  const choice = { distance: 0.5, offset: 40, box: { x: -90, y: -100, width: 80, height: 20 } };
  expect(chooseLabelPlacement([choice], obstacles)).toEqual(choice);
  expect(obstacles.overlap(choice.box)).toBe(1600);
});
