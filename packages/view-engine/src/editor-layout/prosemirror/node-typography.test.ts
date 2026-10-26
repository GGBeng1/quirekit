import { describe, expect, it } from "vitest";
import { Schema } from "@quirekit/pm";
import { applyQuireNodeTextMetrics } from "./font";
import { collectQuireProseMirrorInlineSources } from "./inline";

describe("neutral absolute node typography", () => {
  it("scales natural line metrics from absolute CSS size rather than a second relative basis", () => {
    const imported = applyQuireNodeTextMetrics("16px serif", 24, 18, { fontSize: "10pt", fontScale: 1, lineHeightScale: 1 });
    expect(imported.lineHeight).toBeCloseTo(20, 5);
    expect(imported.baselineOffset).toBeCloseTo(15, 5);
    expect(applyQuireNodeTextMetrics("16px serif", 24, 18, { fontSize: "18pt", fontScale: 2, lineHeightScale: 2 }))
      .toMatchObject({ lineHeight: 36, baselineOffset: 27 });
    expect(applyQuireNodeTextMetrics("16px serif", 24, 18, { fontSize: "18pt", fontScale: 2, lineHeightScale: 3 }))
      .toMatchObject({ lineHeight: 72, baselineOffset: 54 });
  });
  it("lets direct run size and color override a paragraph's absolute defaults", () => {
    const schema = new Schema({ nodes: { doc: { content: "paragraph+" }, paragraph: { content: "text*" }, text: {} }, marks: { direct: {} } });
    const node = schema.node("paragraph", null, [schema.text("one"), schema.text("two", [schema.mark("direct")])]);
    const sources = collectQuireProseMirrorInlineSources({ node, contentStart: 1, contentEnd: 7, sourceId: "text", font: "16px serif",
      nodeStyle: { fontSize: "18pt", color: "#345678" }, resolveMarkStyle: () => ({ fontSize: "9pt", color: "#663399" }) });
    expect(sources.textRuns).toMatchObject([{ font: "24px serif", color: "#345678" }, { font: "12px serif", color: "#663399" }]);
  });
});
