import { beforeAll, expect, it } from "vitest";
import { createFlowchartNode } from "@quirekit/flowchart";
import { nodeAttrs, nodeMarkup } from "./nodes";
import { initializeDrawing } from "../drawing/rough";
beforeAll(initializeDrawing);
const appearance = { primary: "#123456", surface: "#ffffff", text: "#222222", line: "#888888", fontFamily: "sans-serif" };
it("keeps entity title, field keys and type columns separate across drawing styles", () => {
  const node = createFlowchartNode("entity", "er-entity", { x: 0, y: 0 }, "Entity");
  for (const drawing of ["standard", "sketch", "pencil"] as const) {
    const source = { ...node, style: { drawing } }, attrs = nodeAttrs(source, appearance);
    expect(attrs.memberKey0?.text).toBe("PK"); expect(attrs.memberName0?.text).toBe("id"); expect(attrs.memberType0?.text).toBe("uuid");
    expect(Number(attrs.memberName0?.y)).toBeGreaterThan(Number(attrs.label?.y));
    expect(attrs.memberType0?.textAnchor).toBe("end"); expect(JSON.stringify(nodeMarkup(source, appearance))).toContain("memberKey0");
  }
});
it("omits only presentation rows at tiny sizes, without emitting negative geometry or losing source", () => {
  const node = createFlowchartNode("entity", "er-entity", { x: 0, y: 0 }, "Entity");
  const attrs = nodeAttrs({ ...node, width: 20, height: 20 }, appearance);
  expect(attrs.memberName0).toBeUndefined(); expect(node.entity!.fields).toHaveLength(1);
  expect(JSON.stringify(attrs)).not.toMatch(/NaN|Infinity/);
});

it("keeps UML member text inside the same separators at minimum and highly uneven section sizes", async () => {
  const { updateFlowchartContent, createFlowchart } = await import("@quirekit/flowchart");
  const { classDivider } = await import("../geometry/modeling");
  const original = createFlowchartNode("class", "uml-class", { x: 0, y: 0 }, "Account");
  const node = updateFlowchartContent({ ...createFlowchart(), nodes: [original] }, original.id, { text: "Account", uml: { attributes: Array.from({ length: 100 }, (_, i) => `- field${i}: string`), operations: ["+ save(): void"] } }).nodes[0]!;
  const attrs = nodeAttrs(node, appearance), divider = classDivider(node);
  expect(attrs.attribute99?.text).toBe("- field99: string"); expect(attrs.operation0?.text).toBe("+ save(): void");
  expect(Number(attrs.attribute99?.y)).toBeLessThan(divider); expect(Number(attrs.operation0?.y)).toBeGreaterThan(divider);
  expect(attrs.detail?.d).toContain(`M0 ${divider}`);
  const small = nodeAttrs({ ...node, width: 20, height: 20 }, appearance);
  expect(small.attribute0).toBeUndefined(); expect(small.operation0).toBeUndefined();
});
