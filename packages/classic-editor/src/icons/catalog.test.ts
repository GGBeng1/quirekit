import { describe, expect, it } from "vitest";
import {
  classicEditorIconRegistry,
  classicEditorIcons,
  resolveClassicEditorIcon,
  resolveClassicEditorIconData
} from "./catalog";

const ribbonIconNames = [
  "alignCenter",
  "alignDistribute",
  "alignEnd",
  "alignJustify",
  "alignStart",
  "bold",
  "calendar",
  "checkbox",
  "clearFormatting",
  "formatPainter",
  "contentControlComboBox",
  "contentControlDropDown",
  "extension",
  "fillColor",
  "fontLibrary",
  "fontUnavailable",
  "fontSizeDecrease",
  "fontSizeIncrease",
  "horizontalRule",
  "indentDecrease",
  "indentIncrease",
  "italic",
  "listBullet",
  "listNumbered",
  "listTask",
  "lineSpacing",
  "messageSquarePlus",
  "paragraphSettings",
  "redo",
  "strike",
  "table",
  "textBox",
  "textCursorInput",
  "textColor",
  "textDirectionLtr",
  "textDirectionRtl",
  "textHighlight",
  "underline",
  "undo",
  "trackChanges",
  "revisionAccept",
  "revisionReject",
  "revisionAcceptAll",
  "revisionRejectAll",
  "revisionMarkup",
  "revisionSimpleMarkup",
  "revisionFinal",
  "revisionOriginal",
  "revisionPrevious",
  "revisionNext",
  "commentPrevious",
  "commentNext",
  "canvas",
  "svg"
] as const;

describe("Classic Editor trusted icon catalog", () => {
  it("registers renderer data without losing source attribution", () => {
    expect(resolveClassicEditorIconData("bold")).toMatchObject({
      source: "lucide",
      license: "ISC"
    });
    expect(resolveClassicEditorIconData("textColor")).toMatchObject({
      source: "custom",
      license: "QuireKit"
    });
    expect(classicEditorIconRegistry.has("unknown")).toBe(false);
    expect(resolveClassicEditorIconData("unknown")).toBeUndefined();
  });

  it("keeps every compact ribbon control on the Lucide outline standard", () => {
    for (const name of ribbonIconNames) {
      const icon = resolveClassicEditorIcon(name);
      expect(icon, name).toMatch(
        /lucide-|data-icon-style="lucide-custom"/u
      );
      expect(icon, name).toContain('viewBox="0 0 24 24"');
      expect(icon, name).toContain('stroke-width="2"');
      expect(icon, name).toContain('stroke-linecap="round"');
      expect(icon, name).toContain('stroke-linejoin="round"');
    }
  });

  it("keeps the separately tuned ruler handle artwork stable", () => {
    for (const [name, geometry] of [
      ["rulerEnd", "L2.257 17.125"],
      ["rulerFirstLine", "L2.257 6.871"],
      ["rulerMarginResize", "m7 8l-4 4l4 4"],
      ["rulerStart", "M3 7a2 2"]
    ] as const) {
      const icon = resolveClassicEditorIcon(name);
      expect(icon, name).toContain("Tabler Icons 3.45.0");
      expect(icon, name).toContain(geometry);
    }
  });

  it("preserves width and height for every rectangle geometry", () => {
    for (const [name, icon] of Object.entries(classicEditorIcons)) {
      for (const rectangle of icon.match(/<rect\b[^>]*>/gu) ?? []) {
        expect(rectangle, `${name}: ${rectangle}`).toMatch(/\bwidth="/u);
        expect(rectangle, `${name}: ${rectangle}`).toMatch(/\bheight="/u);
      }
    }
  });

  it("renders the left and right panel controls as distinguishable panels", () => {
    const panelLeft = resolveClassicEditorIcon("panelLeft");
    const panelRight = resolveClassicEditorIcon("panelRight");
    for (const icon of [panelLeft, panelRight]) {
      expect(icon).toContain('<rect width="18" height="18"');
    }
    expect(panelLeft).toContain('d="M9 3v18"');
    expect(panelRight).toContain('d="M15 3v18"');
  });

  it("uses public glyphs for both string and data consumers", () => {
    for (const name of ribbonIconNames) {
      expect(resolveClassicEditorIcon(name)).toBe(resolveClassicEditorIconData(name)?.svg);
    }
    expect(resolveClassicEditorIcon("fontSizeIncrease")).not.toBe(resolveClassicEditorIcon("fontSizeDecrease"));
    expect(resolveClassicEditorIcon("contentControlComboBox")).not.toBe(resolveClassicEditorIcon("contentControlDropDown"));
  });

  it("preserves public color accent layers for legacy SVG consumers", () => {
    const strips = ["textColor", "fillColor", "textHighlight"].map(name =>
      resolveClassicEditorIcon(name)?.match(/<path\b(?=[^>]*class="qk-icon__accent")(?=[^>]*stroke-width=")[^>]*>/u)?.[0]
    );
    expect(strips[0]).toBeDefined();
    expect(new Set(strips).size).toBe(1);
  });

  it("shares the general fill glyph with legacy table fill names and states", () => {
    const fill = resolveClassicEditorIconData("fillColor");
    expect(fill).toMatchObject({ source: "custom", license: "QuireKit" });
    expect(resolveClassicEditorIconData("tableCellFill")).toBe(fill);
    expect(resolveClassicEditorIconData("tableCellFillNone")).toBe(fill);
    expect(resolveClassicEditorIcon("tableCellFill")).toBe(resolveClassicEditorIcon("fillColor"));
    for (const layer of ["qk-icon__accent", "qk-icon__accent-fill", "qk-icon__empty-mark"]) {
      expect(fill?.svg).toContain(`class="${layer}"`);
    }
  });
});
