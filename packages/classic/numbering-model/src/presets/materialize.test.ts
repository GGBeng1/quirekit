import { describe, expect, it } from "vitest";
import { createDefaultWordNumberingRegistry } from "../model";
import { areWordNumberingLevelsEqual } from "./materialize";

describe("Word numbering preset semantics", () => {
  it("distinguishes default and never restart policies", () => {
    const level = createDefaultWordNumberingRegistry()
      .abstractNums["quirekit-decimal"]!.levels["1"]!;

    expect(areWordNumberingLevelsEqual(
      level,
      { ...level, restartAfterLevel: null }
    )).toBe(false);
  });

  it("compares marker styles independent of object property order", () => {
    const level = createDefaultWordNumberingRegistry()
      .abstractNums["quirekit-decimal"]!.levels["0"]!;
    const left = {
      ...level,
      markerStyle: {
        fonts: { ascii: "Arial", highAnsi: "Arial" },
        bold: true,
        color: "#112233"
      }
    } as const;
    const right = {
      ...level,
      markerStyle: {
        color: "#112233",
        bold: true,
        fonts: { highAnsi: "Arial", ascii: "Arial" }
      }
    } as const;

    expect(areWordNumberingLevelsEqual(left, right)).toBe(true);
  });

  it("distinguishes independent complex-script marker fields", () => {
    const level = createDefaultWordNumberingRegistry()
      .abstractNums["quirekit-decimal"]!.levels["0"]!;
    const left = {
      ...level,
      markerStyle: {
        complexScriptBold: false,
        complexScriptItalic: true,
        complexScriptFontSizePt: 12
      }
    } as const;

    expect(areWordNumberingLevelsEqual(left, {
      ...left,
      markerStyle: {
        ...left.markerStyle,
        complexScriptFontSizePt: 12.5
      }
    })).toBe(false);
  });

  it("distinguishes independent marker theme-font references", () => {
    const level = createDefaultWordNumberingRegistry()
      .abstractNums["quirekit-decimal"]!.levels["0"]!;
    const left = {
      ...level,
      markerStyle: {
        fonts: {
          ascii: "Literal Marker",
          asciiTheme: "majorAscii"
        }
      }
    } as const;

    expect(areWordNumberingLevelsEqual(left, {
      ...left,
      markerStyle: {
        fonts: {
          ...left.markerStyle.fonts,
          asciiTheme: "minorAscii"
        }
      }
    })).toBe(false);
  });
});
