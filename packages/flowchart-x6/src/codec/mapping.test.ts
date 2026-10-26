import { expect, it } from "vitest";
import { createFlowchartNode, readFlowchart } from "@quirekit/flowchart";
import { toX6Node, nodeAttrs } from "./nodes";
import { toX6Edge, toX6Terminal } from "./edges";

const theme = { primary: "#2563eb", surface: "#ffffff", text: "#111111", line: "#888888", fontFamily: "sans-serif" };
it("keeps literal Chinese/XML text and semantic source separate from theme projection", () => {
  const node = createFlowchartNode("a", "decision", { x: -25, y: 30 }, "通过？\n<script> & \"literal\"");
  const value = toX6Node(node, theme);
  expect(value.attrs?.label?.text).toBe(node.text);
  expect(value.attrs?.body?.d).toContain("L");
  expect(value.data.source.style).toEqual({});
  expect(toX6Node(node, { ...theme, primary: "#ff0000" }).data).toEqual(value.data);
});
it("preserves fixed ports, free points and manual bends without exposing vendor JSON", () => {
  const node = createFlowchartNode("a", "process", { x: 0, y: 0 }, "A");
  const source = readFlowchart({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [node], edges: [{ id: "e",
    source: { node: "a", port: "left" }, target: { x: -40, y: 100 }, vertices: [{ x: -60, y: 20 }],
    routing: "straight", label: "回路", labelPosition: 0.25, style: { sourceArrow: "block", targetArrow: "none", dashed: true } }] });
  const mapped = toX6Edge(source.edges[0]!, theme);
  expect(mapped.source).toEqual({ cell: "a", port: "left" }); expect(mapped.target).toEqual({ x: -40, y: 100 });
  expect(mapped.vertices).toEqual([{ x: -60, y: 20 }]); expect(mapped.router).toEqual({ name: "normal" });
  expect(mapped.attrs?.line?.targetMarker).toBeNull(); expect(mapped.data.source).toEqual(source.edges[0]);
  expect(toX6Terminal({ node: "a" })).toEqual({ cell: "a" });
  expect(toX6Terminal({ node: "a", anchor: { x: 0.5, y: 0.75 } })).toEqual({ cell: "a",
    anchor: { name: "quirekit-relative", args: { x: 0.5, y: 0.75 } }, connectionPoint: { name: "anchor" } });
});

it("projects native rotation and mirrors geometry/ports without reversing text glyphs",()=>{
  const source={...createFlowchartNode("a","note",{x:0,y:0},"可读文字"),width:160,height:100,rotation:35,flipX:true,flipY:true};
  const value=toX6Node(source,theme);
  expect(value.angle).toBe(35);expect(value.attrs?.body?.transform).toBe("translate(160,100) scale(-1,-1)");
  expect(value.attrs?.label?.transform).toBeUndefined();expect(value.attrs?.label?.text).toBe("可读文字");
  expect(value.ports && "items" in value.ports ? value.ports.items?.find(p=>p.id==="right")?.args : null).toEqual({x:0,y:50});
  expect(nodeAttrs({...source,flipX:false,flipY:false},theme).body?.transform).toBe("translate(0,0) scale(1,1)");
});
