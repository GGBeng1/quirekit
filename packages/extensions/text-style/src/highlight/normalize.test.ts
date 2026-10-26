import { describe, expect, it } from "vitest";
import { normalizeHighlightToken, resolveHighlightTokenFromCss } from "./normalize";

describe("highlight color normalization", () => {
  it("canonicalizes OOXML tokens and rejects values outside ST_HighlightColor", () => {
    expect(normalizeHighlightToken(" DarkYellow ")).toBe("darkYellow");
    expect(normalizeHighlightToken("none")).toBe("none");
    expect(normalizeHighlightToken("#ffff00")).toBeNull();
    expect(normalizeHighlightToken(undefined)).toBeNull();
  });

  it("maps exact palette colors and CSS basic keywords losslessly", () => {
    expect(resolveHighlightTokenFromCss("rgb(255, 255, 0)")).toBe("yellow");
    expect(resolveHighlightTokenFromCss("#008080")).toBe("darkCyan");
    expect(resolveHighlightTokenFromCss("#ff0")).toBe("yellow");
    expect(resolveHighlightTokenFromCss("lime")).toBe("green");
    expect(resolveHighlightTokenFromCss("green")).toBe("darkGreen");
    expect(resolveHighlightTokenFromCss("silver")).toBe("lightGray");
    expect(resolveHighlightTokenFromCss("rgb(255, 255, 255)")).toBe("white");
  });

  it("approximates other colors by hue and lightness without producing white", () => {
    expect(resolveHighlightTokenFromCss("#fff2a8")).toBe("yellow");
    expect(resolveHighlightTokenFromCss("rgb(255, 192, 203)")).toBe("red");
    expect(resolveHighlightTokenFromCss("#cce5ff")).toBe("blue");
    expect(resolveHighlightTokenFromCss("#3a0a0a")).toBe("darkRed");
    expect(resolveHighlightTokenFromCss("#f5f5f5")).toBe("lightGray");
    expect(resolveHighlightTokenFromCss("#555555")).toBe("darkGray");
  });

  it("treats transparent paint as no highlight and leaves unknown syntax unresolved", () => {
    expect(resolveHighlightTokenFromCss("transparent")).toBeNull();
    expect(resolveHighlightTokenFromCss("rgba(255, 255, 0, 0)")).toBeNull();
    expect(resolveHighlightTokenFromCss("orange")).toBeUndefined();
  });
});
