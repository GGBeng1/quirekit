import { describe, expect, it } from "vitest";
import {
  defaultWordParagraphFormatting,
  type WordParagraphFormattingPatch
} from "@quirekit/classic-paragraph-model";
import {
  createDefaultWordParagraphStyleRegistry,
  resolveWordParagraphAppearance,
  resolveWordTableCellParagraphAppearance,
  type WordNamedParagraphStyle,
  type WordParagraphStyleRegistry,
  type WordTableStyleTextLayer
} from "./index";

const compactSpacing: WordParagraphFormattingPatch = {
  spacing: {
    before: null,
    beforeLines: null,
    beforeAutoSpacing: null,
    after: { unit: "dxa", value: 0 },
    afterLines: null,
    afterAutoSpacing: null,
    line: { rule: "auto", value: 240 }
  }
};

/**
 * Creates a registry whose document defaults carry Word's modern after spacing.
 *
 * @returns Registry with an explicit Heading style spacing.
 */
function createRegistry(): WordParagraphStyleRegistry {
  const base = createDefaultWordParagraphStyleRegistry();
  const normal = base.styles[base.defaultParagraphStyleId]!;
  const spaced: WordNamedParagraphStyle = {
    ...normal,
    id: "Spaced",
    name: "Spaced",
    role: "custom",
    basedOn: normal.id,
    default: false,
    paragraph: { spacing: { ...compactSpacing.spacing!, after: { unit: "dxa", value: 400 } } },
    text: {}
  };
  return {
    ...base,
    paragraphDefaults: { spacing: { ...compactSpacing.spacing!, after: { unit: "dxa", value: 160 }, line: { rule: "auto", value: 259 } } },
    styles: {
      ...base.styles,
      [normal.id]: { ...normal, paragraph: { alignment: "start" }, text: { ...normal.text, fontScale: 1.1, lineHeightScale: 1.1 } },
      Spaced: spaced
    }
  };
}

const layer: WordTableStyleTextLayer = {
  paragraph: { ...compactSpacing, alignment: "center" },
  text: { fontWeight: "bold", fontScale: 0.9 }
};

describe("table-style text layer", () => {
  it("overrides document defaults for paragraphs in a styled cell", () => {
    const appearance = resolveWordParagraphAppearance(createRegistry(), defaultWordParagraphFormatting, layer);
    expect(appearance.paragraph.spacing.after).toEqual({ unit: "dxa", value: 0 });
    expect(appearance.paragraph.spacing.line).toEqual({ rule: "auto", value: 240 });
    expect(appearance.text.fontWeight).toBe("bold");
  });

  it("lets the default paragraph style yield its font size and start alignment", () => {
    const appearance = resolveWordParagraphAppearance(createRegistry(), defaultWordParagraphFormatting, layer);
    expect(appearance.text.fontScale).toBe(0.9);
    expect(appearance.paragraph.alignment).toBe("center");
  });

  it("yields absolute default sizes to either table size representation", () => {
    const original = createRegistry();
    const registry = { ...original, styles: {
      ...original.styles, Normal: { ...original.styles.Normal!, text: { fontSize: "14pt", fontScale: 1.1, lineHeightScale: 1.1 } }
    } };
    const relative = resolveWordParagraphAppearance(registry, defaultWordParagraphFormatting, layer);
    expect(relative.text.fontSize).toBeUndefined();
    expect(relative.text.fontScale).toBe(0.9);
    const absolute = resolveWordParagraphAppearance(registry, defaultWordParagraphFormatting, { text: { fontSize: "9pt" } });
    expect(absolute.text.fontSize).toBe("9pt");
    expect(absolute.text.fontScale).toBeUndefined();
    expect(absolute.text.lineHeightScale).toBeUndefined();
  });

  it("keeps an explicit paragraph style above the table layer", () => {
    const appearance = resolveWordParagraphAppearance(
      createRegistry(),
      { ...defaultWordParagraphFormatting, styleId: "Spaced" },
      layer
    );
    expect(appearance.paragraph.spacing.after).toEqual({ unit: "dxa", value: 400 });
  });

  it("applies the layer below direct formatting without a style registry", () => {
    const appearance = resolveWordTableCellParagraphAppearance(
      null,
      { ...defaultWordParagraphFormatting, alignment: "end" },
      layer
    );
    expect(appearance.paragraph.alignment).toBe("end");
    expect(appearance.paragraph.spacing.after).toEqual({ unit: "dxa", value: 0 });
    expect(appearance.text).toEqual({ fontWeight: "bold", fontScale: 0.9 });
  });
});
