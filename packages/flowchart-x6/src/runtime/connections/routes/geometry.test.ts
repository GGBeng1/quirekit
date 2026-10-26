import { expect, it } from "vitest";
import { outsideRoute, selfLoopGuides, terminalDirection } from "./geometry";

it("respects explicit ports and boundary anchors but leaves internal anchors unconstrained", () => {
  expect(terminalDirection({ node: "n", port: "left" })).toBe("left");
  expect(terminalDirection({ node: "n", anchor: { x: 0.5, y: 1 } })).toBe("bottom");
  expect(terminalDirection({ node: "n", anchor: { x: 0.5, y: 0.75 } })).toBeUndefined();
  expect(terminalDirection({ x: 2, y: 3 })).toBeUndefined();
});
it("keeps return channels outside both endpoint boxes in negative world coordinates", () => {
  const a = { x: -200, y: -100, width: 100, height: 60 }, b = { x: 50, y: 200, width: 80, height: 90 };
  expect(outsideRoute(a, b, "top")).toEqual([{ x: -150, y: -148 }, { x: 90, y: -148 }]);
  expect(outsideRoute(a, b, "right")).toEqual([{ x: 178, y: -70 }, { x: 178, y: 245 }]);
});
it("makes automatic self-loops outside the node and separates coincident fixed ports", () => {
  const box = { x: -100, y: 20, width: 160, height: 80 };
  const route = selfLoopGuides(box, { x: 60, y: 60 }, { x: 60, y: 60 }, "right", "right");
  expect(route.length).toBeGreaterThanOrEqual(4);
  expect(route.every(p => p.x > 60 || p.y < 20 || p.y > 100 || p.x < -100)).toBe(true);
  expect(new Set(route.map(p => `${p.x},${p.y}`)).size).toBe(route.length);
});
