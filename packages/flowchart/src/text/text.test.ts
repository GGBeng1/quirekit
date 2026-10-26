import { describe, expect, it } from "vitest";
import { readFlowchart, serializeFlowchart, parseFlowchart } from "../model/document";
import { applyFlowchartTextFormat, replaceFlowchartText, updateFlowchartText } from "./operations";
import type { FlowchartNode } from "../model/types";

const node: FlowchartNode = { id: "text1", shape: "rectangle", x: 0, y: 0, width: 200, height: 80, text: "Hello 世界😀", style: {} };
/** @param value - Text-bearing node. @returns Canonical single-node document. */
function document(value: FlowchartNode = node) { return readFlowchart({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [value], edges: [] }); }
describe("partial caption formats", () => {
  it("preserves ordered immutable Unicode ranges through native source", () => {
    const source = document({ ...node, textSpans: [{ from: 0, to: 5, bold: true }, { from: 6, to: 8, fontSize: 22, color: "#1266cc", link: "https://example.com/" }] });
    expect(parseFlowchart(serializeFlowchart(source))).toEqual(source); expect(Object.isFrozen(source.nodes[0]!.textSpans![0])).toBe(true);
  });
  it("rejects overlaps, unknown keys, surrogate splits and unsafe links", () => {
    for (const textSpans of [[{ from: 8, to: 9, bold: true }], [{ from: 0, to: 4, bold: true }, { from: 3, to: 5, color: "#123456" }], [{ from: 0, to: 1 }], [{ from: 0, to: 1, link: "javascript:alert(1)" }], [{ from: 0, to: 1, fontSize: 100 }], [{ from: 0, to: 1, html: "<b>hi</b>" }]]) expect(() => document({ ...node, textSpans } as FlowchartNode)).toThrow();
    expect(() => document({ ...node, shape: "group", textSpans: [{ from: 0, to: 1, bold: true }] })).toThrow();
  });
  it("splits partial coverage, preserves other properties and merges equal neighbors", () => {
    const first = applyFlowchartTextFormat(node.text, [], 0, 5, { bold: true });
    const second = applyFlowchartTextFormat(node.text, first, 2, 8, { color: "#123456" });
    expect(second).toEqual([{ from: 0, to: 2, bold: true }, { from: 2, to: 5, bold: true, color: "#123456" }, { from: 5, to: 8, color: "#123456" }]);
    expect(applyFlowchartTextFormat(node.text, second, 0, 8, { bold: null })).toEqual([{ from: 2, to: 8, color: "#123456" }]);
    expect(() => applyFlowchartTextFormat(node.text, first, 1, 1, { bold: true })).toThrow();
  });
  it("maps text edits without splitting an emoji and inherits only within one span", () => {
    const source = { ...node, textSpans: [{ from: 0, to: 5, bold: true }, { from: 8, to: 10, color: "#123456" }] };
    expect(replaceFlowchartText(source, "He!llo 世界😀").textSpans).toEqual([{ from: 0, to: 6, bold: true }, { from: 9, to: 11, color: "#123456" }]);
    expect(replaceFlowchartText(source, "Hello 世界😃").textSpans).toEqual([{ from: 0, to: 5, bold: true }]);
    expect(replaceFlowchartText(source, "H!😀").textSpans).toEqual([{ from: 0, to: 1, bold: true }, { from: 2, to: 4, color: "#123456" }]);
  });
  it("applies text and spans atomically and rejects stale or locked targets", () => {
    const before = document(), after = updateFlowchartText(before, node.id, "New text", [{ from: 0, to: 3, bold: true }], node);
    expect(after.nodes[0]!.textSpans).toHaveLength(1); expect(before.nodes[0]!.text).toBe(node.text);
    expect(() => updateFlowchartText(after, node.id, "new", [], node)).toThrow(/改变/);
    expect(() => updateFlowchartText(document({ ...node, locked: true }), node.id, "new", [])).toThrow();
  });
  it("retains italic and combined decorations across Unicode edits and clears all selected overrides", () => {
    const first = applyFlowchartTextFormat(node.text, [], 0, 5, { italic: true, underline: true, strike: true, link: "https://example.com" });
    const edited = replaceFlowchartText({ ...node, textSpans: first }, "He!llo 世界😀");
    expect(edited.textSpans).toEqual([{ from: 0, to: 6, italic: true, underline: true, strike: true, link: "https://example.com" }]);
    const off = applyFlowchartTextFormat(edited.text, edited.textSpans!, 2, 4, { underline: false });
    expect(off[1]).toMatchObject({ from: 2, to: 4, italic: true, underline: false, strike: true });
    expect(parseFlowchart(serializeFlowchart(document({ ...edited, textSpans: off })))).toEqual(document({ ...edited, textSpans: off }));
    expect(applyFlowchartTextFormat(edited.text, off, 0, 6, { bold: null, italic: null, underline: null, strike: null, fontSize: null, color: null, link: null })).toEqual([]);
    for (const key of ["italic", "underline", "strike"]) expect(() => document({ ...node, textSpans: [{ from: 0, to: 1, [key]: "true" }] })).toThrow();
  });
});
