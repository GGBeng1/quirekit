import { expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "@quirekit/flowchart";
import { playbackSceneBounds } from "./bounds";
import { sceneActorTransform } from "./transition";

it("interpolates retained identities in world coordinates without a graph or geometry read", () => {
  const before = createFlowchartNode("kept", "process", { x: -120, y: 80 }, "old range");
  const after = { ...before, x: 280, y: 180, text: "new range" };
  const actor = { before, after, retiring: false };
  expect(sceneActorTransform(actor, 0)).toBe("translate(-400,-100)");
  expect(sceneActorTransform(actor, .5)).toBe("translate(-200,-50)");
  expect(sceneActorTransform(actor, 1)).toBe("translate(0,0)");
  expect(sceneActorTransform(actor, -1)).toBe("translate(-400,-100)");
});

it("keeps a fixed extent across disappearing, rotated and newly inserted content", () => {
  const first = { ...createFlowchart(), nodes: [{ ...createFlowchartNode("old", "process", { x: -100, y: -60 }, "old"), rotation: 90 }] };
  const last = { ...createFlowchart(), nodes: [createFlowchartNode("new", "process", { x: 500, y: 200 }, "new")] };
  const bounds = playbackSceneBounds([first, last]);
  expect(bounds.x).toBeCloseTo(-52); expect(bounds.y).toBeCloseTo(-108);
  expect(bounds.width).toBeCloseTo(712); expect(bounds.height).toBeCloseTo(372);
});
