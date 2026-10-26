import { describe, expect, it } from "vitest";
import { Schema } from "@quirekit/pm";
import type { QuireNodeCanvasTextStyle } from "@quirekit/core";
import { collectQuireProseMirrorInlineSources } from "../inline";

const schema = new Schema({ nodes: {
  doc: { content: "paragraph+" }, paragraph: { content: "text*" }, text: {}
}, marks: { textStyle: { attrs: { style: { default: {} } } } } });

/** @param inherited - Effective paragraph style. @param direct - Direct run delta. @returns Resolved mixed-script runs. */
function runs(inherited: QuireNodeCanvasTextStyle, direct: QuireNodeCanvasTextStyle = {}) {
  const node = schema.node("paragraph", null, [schema.text("Ab中文", [schema.mark("textStyle", { style: direct })])]);
  return collectQuireProseMirrorInlineSources({ node, contentStart: 1, contentEnd: 5,
    sourceId: "emphasis", font: "16px sans-serif", nodeStyle: inherited,
    resolveMarkStyle: mark => mark.attrs.style
  }).textRuns;
}

describe("effective emphasis language", () => {
  it.each(["zh-CN", "zh-SG", "zh-Hans", "zh-Hans-CN"])("places %s dot below across font slots", languageEastAsia => {
    const result = runs({ languageLatin: "en-US", languageEastAsia }, { emphasisMark: "dot" });
    expect(result.map(run => run.emphasisMark)).toEqual(["underDot", "underDot"]);
    expect(result.map(run => run.language)).toEqual(["en-US", languageEastAsia]);
    expect(result.map(run => run.text).join("")).toBe("Ab中文");
  });
  it.each(["ja-JP", "ko-KR", "zh-TW", "zh-Hant-CN"])("places %s dot above", languageEastAsia => {
    expect(runs({ languageEastAsia, emphasisMark: "dot" }).every(run => run.emphasisMark === "dot")).toBe(true);
  });
  it("lets direct language override the inherited slot without consulting Latin", () => {
    expect(runs({ languageEastAsia: "ja-JP", emphasisMark: "dot" }, { languageEastAsia: "zh-CN", languageLatin: "ja-JP" })
      .every(run => run.emphasisMark === "underDot")).toBe(true);
    expect(runs({ languageEastAsia: "zh-CN", emphasisMark: "dot" }, { languageEastAsia: "ja-JP" })
      .every(run => run.emphasisMark === "dot")).toBe(true);
  });
  it("distinguishes direct none from omitted emphasis", () => {
    expect(runs({ languageEastAsia: "zh-CN", emphasisMark: "dot" }, { emphasisMark: "none" })
      .every(run => run.emphasisMark === undefined)).toBe(true);
    expect(runs({ languageEastAsia: "zh-CN", emphasisMark: "dot" })
      .every(run => run.emphasisMark === "underDot")).toBe(true);
  });
  it("retains explicit underDot regardless of language and does not invent a missing language", () => {
    expect(runs({ languageEastAsia: "ja-JP" }, { emphasisMark: "underDot" }).every(run => run.emphasisMark === "underDot")).toBe(true);
    expect(runs({}, { emphasisMark: "dot" })).toMatchObject([{ emphasisMark: "dot" }]);
  });
});
