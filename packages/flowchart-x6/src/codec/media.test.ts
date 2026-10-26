import { expect, it } from "vitest";
import { createFlowchartIcon, createFlowchartImageNode, createFlowchartNode } from "@quirekit/flowchart";
import { nodeAttrs, toX6Node } from "./nodes";
const theme = { primary: "#2563eb", surface: "#ffffff", text: "#111111", line: "#888888", fontFamily: "sans-serif" };
it("projects embedded images with intrinsic containment, accessible text and local mirroring", () => {
  const original = createFlowchartImageNode("logo", createFlowchartIcon("server", "#aabbcc", "服务器"), {x:-100,y:20});
  const node = { ...original, flipX: true, rotation: 90, style: {drawing:"pencil" as const} }, attrs = nodeAttrs(node,theme);
  expect(attrs.image).toMatchObject({href:node.image!.dataUrl,preserveAspectRatio:"none","aria-label":"服务器"});
  expect(attrs.imageFrame).toMatchObject({ transform:`translate(${node.width},0) scale(-1,1)` });
  expect(attrs.imageClip).toMatchObject({ x: 0, y: 0, width: node.width, height: node.height });
  expect(attrs.body).toMatchObject({fill:"transparent",stroke:"none",pointerEvents:"all"});
  expect(attrs.drawingOutline?.d).toBe(""); expect(attrs.label?.text).toBe("");
  expect(toX6Node(node,theme).data.source).toEqual(node);
});
it("does not add empty image elements to ordinary nodes", () => {
  const value=toX6Node(createFlowchartNode("text","text",{x:0,y:0},"文字"),theme);
  expect(value.markup).not.toContainEqual({tagName:"image",selector:"image"});
});
