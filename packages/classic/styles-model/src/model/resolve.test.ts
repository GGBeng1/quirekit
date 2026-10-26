import { describe, expect, it } from "vitest";
import {
  createDefaultWordParagraphStyleRegistry,
  resolveWordNamedParagraphStyle,
  resolveWordParagraphAppearance,
  type WordNamedParagraphStyle
} from "./index";
import {
  defaultWordParagraphFormatting,
  type WordParagraphFormatting
} from "@quirekit/classic-paragraph-model";

/**
 * Creates one custom style derived from Normal with a numbering reference.
 *
 * @param base - Default registry Normal style.
 * @param id - New style id.
 * @param basedOn - Parent style id.
 * @param numbering - Style-level numbering reference.
 * @returns Custom named style.
 */
function numberedStyle(
  base: WordNamedParagraphStyle,
  id: string,
  basedOn: string,
  numbering: WordNamedParagraphStyle["numbering"]
): WordNamedParagraphStyle {
  return { ...base, id, name: id, role: "custom", basedOn, default: false, numbering };
}

describe("Word named paragraph style resolution", () => {
  it("inherits style numbering fields independently and lets numId 0 remove them", () => {
    const registry = createDefaultWordParagraphStyleRegistry();
    const normal = registry.styles.Normal!;
    const styles = {
      ...registry.styles,
      ListNumber: numberedStyle(normal, "ListNumber", "Normal", { numId: "5", level: null }),
      ListChild: numberedStyle(normal, "ListChild", "ListNumber", { numId: null, level: 1 }),
      Unlisted: numberedStyle(normal, "Unlisted", "ListNumber", { numId: "0", level: null }),
      Plain: numberedStyle(normal, "Plain", "ListNumber", undefined)
    };
    const resolve = (styleId: string) =>
      resolveWordNamedParagraphStyle({ ...registry, styles }, styleId).numbering;

    expect(resolve("ListNumber")).toEqual({ numId: "5", level: 0, sourceStyleId: "ListNumber" });
    expect(resolve("ListChild")).toEqual({ numId: "5", level: 1, sourceStyleId: "ListChild" });
    expect(resolve("Plain")).toEqual({ numId: "5", level: 0, sourceStyleId: "ListNumber" });
    expect(resolve("Unlisted")).toBeNull();
    expect(resolve("Normal")).toBeNull();
  });

  it("merges ancestors before descendants and preserves explicit false values", () => {
    const registry = createDefaultWordParagraphStyleRegistry();
    const custom: WordNamedParagraphStyle = {
      ...registry.styles.Normal!,
      id: "CustomBody",
      name: "Custom Body",
      role: "custom",
      basedOn: "Normal",
      default: false,
      paragraph: {
        alignment: "center",
        pagination: {
          widowControl: false,
          keepNext: null,
          keepLines: true,
          pageBreakBefore: null
        }
      },
      text: { fontScale: 1.2 }
    };
    const result = resolveWordNamedParagraphStyle({
      ...registry,
      styles: { ...registry.styles, CustomBody: custom }
    }, "CustomBody");

    expect(result.inheritanceChain).toEqual(["Normal", "CustomBody"]);
    expect(result.paragraph).toMatchObject({
      alignment: "center",
      pagination: { widowControl: false, keepLines: true }
    });
    expect(result.text).toMatchObject({
      documentFontRole: "body",
      fontScale: 1.2
    });
  });

  it("reports cycles without discarding safely visited style properties", () => {
    const registry = createDefaultWordParagraphStyleRegistry();
    const first = {
      ...registry.styles.Normal!,
      id: "First",
      name: "First",
      basedOn: "Second",
      paragraph: { alignment: "center" as const }
    };
    const second = {
      ...registry.styles.Normal!,
      id: "Second",
      name: "Second",
      basedOn: "First",
      paragraph: { spacing: {
        before: { unit: "dxa" as const, value: 120 },
        beforeLines: null,
        beforeAutoSpacing: null,
        after: null,
        afterLines: null,
        afterAutoSpacing: null,
        line: null
      } }
    };
    const result = resolveWordNamedParagraphStyle({
      ...registry,
      styles: { ...registry.styles, First: first, Second: second }
    }, "First");

    expect(result.diagnostics).toEqual([
      expect.objectContaining({ kind: "inheritance-cycle", styleId: "First" })
    ]);
    expect(result.paragraph.alignment).toBe("center");
    expect(result.paragraph.spacing.before).toEqual({
      unit: "dxa",
      value: 120
    });
  });

  it("lets direct paragraph formatting override the named heading style", () => {
    const registry = createDefaultWordParagraphStyleRegistry();
    const direct: WordParagraphFormatting = {
      ...defaultWordParagraphFormatting,
      styleId: "Heading2",
      alignment: "end",
      borders: {
        top: null,
        start: null,
        bottom: {
          style: "single",
          color: "#4F81BD",
          themeColor: null,
          themeTint: null,
          themeShade: null,
          sizeEighthPoints: 12,
          spacePoints: 0,
          shadow: null,
          frame: null
        },
        end: null,
        between: null,
        bar: null
      },
      shading: {
        pattern: "clear",
        color: "auto",
        fill: "#F0F4FA",
        themeColor: null,
        themeFill: null,
        themeFillTint: null,
        themeFillShade: null
      },
      markFormatting: {
        fontFamily: null,
        fontSizePt: null,
        bold: true,
        italic: null,
        color: "#2563EB",
        underline: null,
        strike: null
      }
    };
    const result = resolveWordParagraphAppearance(registry, direct);

    expect(result.namedStyle.inheritanceChain).toEqual(["Normal", "Heading2"]);
    expect(result.paragraph).toMatchObject({
      styleId: "Heading2",
      outlineLevel: 1,
      alignment: "end",
      borders: {
        bottom: expect.objectContaining({ color: "#4F81BD" })
      },
      shading: expect.objectContaining({ fill: "#F0F4FA" }),
      markFormatting: expect.objectContaining({
        bold: true,
        color: "#2563EB"
      })
    });
    expect(result.text).toMatchObject({
      documentFontRole: "heading",
      documentOutlineLevel: 2,
      fontScale: 1.5
    });
  });
});
