import { describe, expect, it } from "vitest";
import { defaultWordParagraphFormatting as base } from "../model";
import { applyWordParagraphDecoration, defaultWordParagraphBorderPen, isWordParagraphDecorationOperation,
  isWordParagraphBorderEnabled, wordParagraphBorderPresets, wordParagraphBorderSides } from "./index";

describe("paragraph decoration authoring", () => {
  it("starts with a plain black pen without introducing paragraph shading", () => {
    const result = applyWordParagraphDecoration(base, base, { kind: "preset", preset: "box", pen: defaultWordParagraphBorderPen });
    expect(result.borders?.top?.color).toBe("#000000");
    expect(result.shading).toBe(base.shading);
  });
  it.each(wordParagraphBorderPresets)("creates the complete %s topology without inherited extra edges", preset => {
    const boxed = applyWordParagraphDecoration(base, base, { kind: "preset", preset: "box", pen: defaultWordParagraphBorderPen });
    const decorated = applyWordParagraphDecoration(base, boxed, { kind: "preset", preset, pen: defaultWordParagraphBorderPen });
    expect(wordParagraphBorderSides.filter(side => isWordParagraphBorderEnabled(decorated.borders?.[side])))
      .toEqual(preset === "box" ? [...wordParagraphBorderSides] : preset === "none" ? [] : [preset]);
    expect(decorated.borders?.between?.style).toBe("nil");
    expect(decorated.borders?.bar?.style).toBe("nil");
  });

  it("toggles individual sides without replacing other edges or shading", () => {
    const bottom = applyWordParagraphDecoration(base, base, { kind: "preset", preset: "bottom", pen: defaultWordParagraphBorderPen });
    const filled = applyWordParagraphDecoration(bottom, bottom, { kind: "fill", color: "#123456" });
    const custom = { ...filled, borders: { ...filled.borders!, bar: { ...filled.borders!.bottom!, style: "wave" } } };
    const top = applyWordParagraphDecoration(custom, custom, { kind: "side", side: "top", enabled: true, pen: defaultWordParagraphBorderPen });
    expect(top.borders?.bar).toBe(custom.borders.bar);
    expect(top.borders?.bottom).toBe(custom.borders.bottom);
    expect(top.shading).toBe(custom.shading);
    const disabled = applyWordParagraphDecoration(top, top, { kind: "side", side: "bottom", enabled: false, pen: defaultWordParagraphBorderPen });
    expect(disabled.borders?.bottom?.style).toBe("nil");
    expect(disabled.borders?.top).toBe(top.borders?.top);
  });

  it("makes explicit none distinct from inheritance and retains unrelated fields", () => {
    const direct = { ...base, styleId: "Heading1", preservation: { litAstAttrs: { custom: true } } };
    const preset = applyWordParagraphDecoration(direct, direct, {
      kind: "preset", preset: "box", pen: defaultWordParagraphBorderPen
    });
    const none = applyWordParagraphDecoration(preset, preset, { kind: "preset", preset: "none", pen: defaultWordParagraphBorderPen });
    expect(Object.values(none.borders!)).toHaveLength(6);
    expect(Object.values(none.borders!).every(edge => edge?.style === "nil")).toBe(true);
    expect(applyWordParagraphDecoration(none, none, { kind: "restore" })).toEqual(direct);
  });

  it("patches only active sides and clears themes only when changing color", () => {
    const boxed = applyWordParagraphDecoration(base, base, { kind: "preset", preset: "box", pen: defaultWordParagraphBorderPen });
    const effective = { ...boxed, borders: { ...boxed.borders!, top: { ...boxed.borders!.top!, themeColor: "accent1", spacePoints: 7 } } };
    const patch = applyWordParagraphDecoration(base, effective, { kind: "border", patch: { sizeEighthPoints: 12 } });
    expect(patch.borders?.top).toMatchObject({ sizeEighthPoints: 12, spacePoints: 7, themeColor: "accent1" });
    expect(patch.borders?.bottom?.spacePoints).toBe(defaultWordParagraphBorderPen.spacePoints);
    const colored = applyWordParagraphDecoration(patch, patch, { kind: "border", patch: { color: "#112233" } });
    expect(colored.borders?.top).toMatchObject({ color: "#112233", themeColor: null });
    expect(applyWordParagraphDecoration(base, base, { kind: "border", patch: { spacePoints: 5 } })).toBe(base);
  });

  it("keeps fill independent, explicitly clears it, and validates complete input", () => {
    const box = applyWordParagraphDecoration(base, base, { kind: "preset", preset: "bottom", pen: defaultWordParagraphBorderPen });
    const filled = applyWordParagraphDecoration(box, box, { kind: "fill", color: "#F0F4FA" });
    expect(filled.borders).toBe(box.borders);
    expect(filled.shading).toMatchObject({ pattern: "clear", fill: "#F0F4FA" });
    expect(applyWordParagraphDecoration(filled, filled, { kind: "fill", color: null }).shading).toMatchObject({ pattern: "clear", fill: "auto" });
    for (const operation of [
      { kind: "border", patch: { spacePoints: 32 } },
      { kind: "border", patch: { spacePoints: 1.5 } },
      { kind: "border", patch: { sizeEighthPoints: NaN } },
      { kind: "border", patch: {} },
      { kind: "border", patch: { style: { toString: () => "single" } } },
      { kind: "fill", color: "rgba(0,0,0,.5)" },
      { kind: "preset", preset: "unknown", pen: defaultWordParagraphBorderPen }
    ]) expect(isWordParagraphDecorationOperation(operation)).toBe(false);
  });
});
