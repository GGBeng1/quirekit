import { describe, expect, it } from "vitest";
import { quireKitIconAliases } from "./metadata";
import {
  quireKitEditorIconCatalog,
  quireKitEditorIconData,
  quireIconRegistry
} from "./catalog";

const reviewIconNames = [
  "commentNext",
  "commentPrevious",
  "revisionAccept",
  "revisionAcceptAll",
  "revisionFinal",
  "revisionMarkup",
  "revisionNext",
  "revisionOriginal",
  "revisionPrevious",
  "revisionReject",
  "revisionRejectAll",
  "revisionSimpleMarkup",
  "trackChanges"
] as const;

describe("editor icon catalog", () => {
  it("distinguishes insertion tasks by geometry without missing-name or square placeholders", () => {
    const names = ["tableOfContents", "shapes", "figureCaption", "crossReference", "link",
      "pencilRuler", "whiteboard", "workflow", "textDiagram", "codeXml", "mindMap", "listTree",
      "pageBreak", "sectionBreak", "footnote", "endnote", "notebookPen", "outlineColor"];
    const geometry = names.map(name => {
      expect(quireIconRegistry.has(name), name).toBe(true);
      const data = quireIconRegistry.resolve(name)!;
      expect(data.svg, name).not.toBe(quireKitEditorIconData.square.svg);
      return data.svg.match(/<(?:path|rect|circle)\b[^>]*>/gu)?.join("");
    });
    expect(new Set(geometry).size).toBe(names.length);
  });

  it("uses the standard broken-chain glyph for linkOff", () => {
    const linkOff = quireKitEditorIconCatalog.find((entry) => entry.name === "linkOff");

    expect(linkOff?.data.source).toBe("lucide");
    expect(linkOff?.data.svg).toContain("lucide-unlink");
    expect(linkOff?.data.svg).not.toBe(quireKitEditorIconData.link.svg);
  });

  it("normalizes the diagonal pipette glyph without changing its public box", () => {
    expect(quireKitEditorIconData.pipette.opticalScale).toBe(0.85);
  });

  it("publishes a semantic close glyph instead of repurposing add", () => {
    expect(quireKitEditorIconData.close.source).toBe("lucide");
    expect(quireKitEditorIconData.close.svg).toContain("lucide-x");
    expect(quireKitEditorIconData.close.svg).not.toBe(quireKitEditorIconData.plus.svg);
  });

  it("publishes distinct password visibility actions with searchable Lucide metadata", () => {
    for (const [name, keyword] of [["eye", "显示密码"], ["eyeOff", "隐藏密码"]] as const) {
      const entry = quireKitEditorIconCatalog.find((item) => item.name === name);
      expect(quireIconRegistry.has(name)).toBe(true);
      expect(entry).toMatchObject({
        category: "status",
        keywords: expect.arrayContaining([keyword]),
        data: { source: "lucide", license: "ISC", mirrorInRtl: false }
      });
      expect(quireIconRegistry.resolve(name)).toBe(entry?.data);
    }
    expect(quireIconRegistry.resolve("eye")?.svg)
      .not.toBe(quireIconRegistry.resolve("eyeOff")?.svg);
  });

  it("publishes filled stepper triangles for compact number controls", () => {
    expect(quireKitEditorIconData.triangleUp.svg).toContain('fill="currentColor"');
    expect(quireKitEditorIconData.triangleDown.svg).toContain('fill="currentColor"');
    expect(quireKitEditorIconData.triangleUp.svg).toContain("<path");
    expect(quireKitEditorIconData.triangleDown.svg).toContain("<path");
  });

  it("publishes only audited Lucide and QuireKit editor glyphs", () => {
    expect(quireKitEditorIconCatalog.length).toBeGreaterThan(100);
    expect(new Set(quireKitEditorIconCatalog.map((entry) => entry.name)).size)
      .toBe(quireKitEditorIconCatalog.length);
    expect(new Set(quireKitEditorIconCatalog.map((entry) => entry.data.source)))
      .toEqual(new Set(["lucide", "custom"]));
    expect(quireKitEditorIconCatalog.every((entry) => entry.data.complexity <= 16))
      .toBe(true);
  });

  it("resolves known names without disguising missing icons as squares", () => {
    expect(quireIconRegistry.resolve("bold")).toBe(quireKitEditorIconData.bold);
    expect(quireIconRegistry.resolve("strikethrough")).toBe(quireKitEditorIconData.strike);
    expect(quireIconRegistry.has("unknown")).toBe(false);
    expect(quireIconRegistry.resolve("unknown")).toBeUndefined();
  });

  it("retains editor-specific custom additions without Gravity or Tabler attribution", () => {
    expect(quireKitEditorIconData.textColor.source).toBe("custom");
    expect(quireKitEditorIconData.tableMergeCells.source).toBe("lucide");
    expect(quireKitEditorIconData.tableMergeCells.license).toBe("ISC");
  });

  it("keeps table concepts canonical while resolving removed compatibility names", () => {
    expect("tableBorders" in quireKitEditorIconData).toBe(false);
    expect(quireIconRegistry.resolve("tableBorders"))
      .toBe(quireKitEditorIconData.tableBorderAll);
  });

  it("publishes general fill color while preserving legacy fill names and states", () => {
    const fill = quireKitEditorIconCatalog.find(entry => entry.name === "fillColor");
    expect(fill).toMatchObject({
      label: "填充颜色", category: "formatting", group: "characters",
      keywords: expect.arrayContaining(["填充颜色", "背景色", "底纹", "单元格填充", "颜料桶", "tableCellFill"]),
      data: { source: "custom", license: "QuireKit" }
    });
    expect(quireKitEditorIconData.tableCellFill).toBe(quireKitEditorIconData.fillColor);
    expect(quireIconRegistry.resolve("tableCellFill")).toBe(quireKitEditorIconData.fillColor);
    expect("tableCellFillNone" in quireKitEditorIconData).toBe(false);
    expect(quireIconRegistry.resolve("tableCellFillNone"))
      .toBe(quireKitEditorIconData.fillColor);
    expect(quireKitEditorIconCatalog.map(entry => entry.name)).not.toContain("tableCellFill");
    for (const layer of ["qk-icon__accent", "qk-icon__accent-fill", "qk-icon__empty-mark"]) {
      expect(quireKitEditorIconData.fillColor.svg).toContain(`class="${layer}"`);
    }
  });

  it("shares one color-state strip across text color, fill color and highlight", () => {
    const strips = ["textColor", "fillColor", "textHighlight"].map(name =>
      quireIconRegistry.resolve(name)?.svg.match(/<path\b(?=[^>]*class="qk-icon__accent")(?=[^>]*stroke-width=")[^>]*>/u)?.[0]
    );
    expect(strips[0]).toBeDefined();
    expect(new Set(strips).size).toBe(1);
  });

  it("uses standard review glyphs and only a purpose-specific simple-markup addition", () => {
    for (const name of reviewIconNames) {
      expect(quireKitEditorIconData[name].source, name)
        .toBe(name === "revisionSimpleMarkup" ? "custom" : "lucide");
      expect(quireKitEditorIconCatalog.find(entry => entry.name === name)?.category).toBe("review");
    }
    expect(quireKitEditorIconData.commentPrevious.svg).toBe(quireKitEditorIconData.revisionPrevious.svg);
    expect(quireKitEditorIconData.commentNext.svg).toBe(quireKitEditorIconData.revisionNext.svg);
    expect(quireKitEditorIconData.commentPrevious.svg).not.toBe(quireKitEditorIconData.commentNext.svg);
  });

  it("keeps complete direction and operation families adjacent in semantic order", () => {
    const names = quireKitEditorIconCatalog.map(entry => entry.name);
    for (const family of [
      ["chevronLeft", "chevronRight", "chevronUp", "chevronDown"],
      ["arrowLeft", "arrowRight", "arrowUp", "arrowDown"],
      ["alignStart", "alignCenter", "alignEnd", "alignJustify", "alignDistribute"],
      ["undo", "redo"], ["eye", "eyeOff"], ["zoomIn", "zoomOut"],
      ["revisionAccept", "revisionReject", "revisionAcceptAll", "revisionRejectAll"],
      ["textDirectionLtr", "textDirectionRtl"],
      ["textColor", "fillColor", "textHighlight"],
      ["tableInsertColumnLeft", "tableInsertColumnRight", "tableInsertRowAbove", "tableInsertRowBelow"]
    ] as const) {
      const start = names.indexOf(family[0]);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(names.slice(start, start + family.length)).toEqual(family);
    }
  });

  it("assigns every canonical glyph exactly once and keeps aliases outside browsing", () => {
    const names = quireKitEditorIconCatalog.map(entry => entry.name);
    const canonicalNames = Object.keys(quireKitEditorIconData)
      .filter(name => !(name in quireKitIconAliases));
    expect(new Set(names)).toEqual(new Set(canonicalNames));
    expect(quireKitEditorIconData.tableRepair).toBe(quireKitEditorIconData.wrench);
    for (const entry of quireKitEditorIconCatalog) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.group.length).toBeGreaterThan(0);
      expect(entry.data).toBe(quireIconRegistry.resolve(entry.name));
      expect(entry.upstream === undefined).toBe(entry.data.source === "custom");
    }
    expect(new Set(quireKitEditorIconCatalog.map(entry => entry.scope)))
      .toEqual(new Set(["general", "editor"]));
    for (const [alias, target] of [["canvas", "fileText"], ["tableSelectGroup", "tableSelectCell"]] as const) {
      expect(names).not.toContain(alias);
      expect(quireKitEditorIconData[alias]).toBe(quireKitEditorIconData[target]);
    }
  });

  it("uses ordinary navigation arrows and a document without history imagery for review", () => {
    expect(quireKitEditorIconData.commentPrevious).toEqual(quireKitEditorIconData.arrowUp);
    expect(quireKitEditorIconData.commentNext).toEqual(quireKitEditorIconData.arrowDown);
    expect(quireKitEditorIconData.revisionOriginal).toEqual(quireKitEditorIconData.fileText);
  });

  it("keeps physical text directions and vertical comment navigation unchanged in RTL", () => {
    expect(quireKitEditorIconData.textDirectionLtr.mirrorInRtl).toBe(false);
    expect(quireKitEditorIconData.textDirectionRtl.mirrorInRtl).toBe(false);
    expect(quireKitEditorIconData.commentPrevious.mirrorInRtl).toBe(false);
    expect(quireKitEditorIconData.commentNext.mirrorInRtl).toBe(false);
  });
});
