import { expect, it } from "vitest";
import { createMindMapDocument, setMindMapLayout, readMindMapDocument } from "../index";
import { exportXmindContent, parseXmindContent } from "../xmind";
it("admits new layouts only in v6 and preserves every source field through a layout roundtrip", () => {
  const source = createMindMapDocument({ text: "根", children: [{ text: "分支", children: [] }] });
  expect(() => readMindMapDocument({ ...source, layout: "organization" })).toThrow("layout");
  for (const layout of ["organization", "timeline"] as const) {
    const next = setMindMapLayout(source, layout);
    expect(next).toEqual({ ...source, version: 6, layout, annotations: [] });
    expect(setMindMapLayout(next, layout)).toBe(next);
    expect(createMindMapDocument({ text: "新建", children: [] }, { layout }).version).toBe(6);
    const imported = parseXmindContent(exportXmindContent(next).content);
    expect(imported.diagnostics).toEqual([]); expect(imported.sheets[0]!.document.layout).toBe(layout);
  }
});
