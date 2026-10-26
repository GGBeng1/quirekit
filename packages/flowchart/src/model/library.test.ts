import { expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "./create";
import { readFlowchart } from "./document";
import { flowchartShapes } from "./shapes";
import { createFlowchartIcon } from "../media/icons";
import { createFlowchartImageNode } from "../media/image";

it("admits every symbol with stable, lossless defaults", () => {
  expect(new Set(flowchartShapes).size).toBe(66);
  const source = { ...createFlowchart(), nodes: flowchartShapes.map((shape, i) => shape === "image" ? createFlowchartImageNode(`n${i}`, createFlowchartIcon("server"), { x: i * 200, y: 40 }) : createFlowchartNode(`n${i}`, shape, { x: i * 200, y: 40 }, "中文标题")) };
  expect(readFlowchart(JSON.parse(JSON.stringify(source)))).toEqual(source);
  expect(source.nodes.find(n => n.shape === "arrow-up")!.height).toBeGreaterThan(source.nodes.find(n => n.shape === "arrow-up")!.width);
  expect(() => readFlowchart({ ...source, nodes: [{ ...source.nodes[0], shape: "unknown" }] })).toThrow();
});
