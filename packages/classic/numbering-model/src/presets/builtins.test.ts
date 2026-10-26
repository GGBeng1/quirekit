import { describe, expect, it } from "vitest";
import {
  circleWordBulletPresetId,
  createBuiltinWordNumberingPresets,
  decimalDotWordOrderedPresetId,
  decimalRightParenWordOrderedPresetId,
  defaultWordBulletPresetId,
  defaultWordOrderedPresetId,
  defaultWordTaskPresetId,
  diamondWordBulletPresetId,
  discWordBulletPresetId,
  enclosedCircleWordOrderedPresetId,
  lowerLetterDotWordOrderedPresetId,
  lowerRomanDotWordOrderedPresetId,
  mixedEnclosedWordOrderedPresetId,
  mixedWordOrderedPresetId,
  officeWordOrderedPresetId,
  parenthesizedDecimalWordOrderedPresetId,
  parenthesizedLetterWordOrderedPresetId,
  squareWordBulletPresetId,
  upperLetterDotWordOrderedPresetId,
  upperRomanDotWordOrderedPresetId
} from "./builtins";

describe("built-in Word numbering presets", () => {
  it("publishes deterministic semantic families for the Classic galleries", () => {
    const presets = createBuiltinWordNumberingPresets();

    expect(presets.map((preset) => preset.id)).toEqual([
      defaultWordOrderedPresetId,
      decimalDotWordOrderedPresetId,
      decimalRightParenWordOrderedPresetId,
      parenthesizedDecimalWordOrderedPresetId,
      lowerLetterDotWordOrderedPresetId,
      parenthesizedLetterWordOrderedPresetId,
      upperLetterDotWordOrderedPresetId,
      lowerRomanDotWordOrderedPresetId,
      upperRomanDotWordOrderedPresetId,
      enclosedCircleWordOrderedPresetId,
      mixedWordOrderedPresetId,
      mixedEnclosedWordOrderedPresetId,
      officeWordOrderedPresetId,
      defaultWordBulletPresetId,
      discWordBulletPresetId,
      circleWordBulletPresetId,
      squareWordBulletPresetId,
      diamondWordBulletPresetId,
      defaultWordTaskPresetId
    ]);
    expect(presets.filter((preset) => preset.kind === "ordered")).toHaveLength(13);
    expect(presets.filter((preset) => preset.kind === "bullet")).toHaveLength(5);
    expect(presets.filter((preset) => preset.kind === "task")).toHaveLength(1);
  });

  it("keeps every built-in marker and geometry field in an atomic preset tuple", () => {
    const presets = createBuiltinWordNumberingPresets();
    const decimalDot = presets.find(
      (preset) => preset.id === decimalDotWordOrderedPresetId
    );
    const parenthesizedLetter = presets.find(
      (preset) => preset.id === parenthesizedLetterWordOrderedPresetId
    );
    const enclosedCircle = presets.find(
      (preset) => preset.id === enclosedCircleWordOrderedPresetId
    );
    const mixed = presets.find(
      (preset) => preset.id === mixedWordOrderedPresetId
    );
    const mixedEnclosed = presets.find(
      (preset) => preset.id === mixedEnclosedWordOrderedPresetId
    );
    const office = presets.find(
      (preset) => preset.id === officeWordOrderedPresetId
    );
    const diamond = presets.find(
      (preset) => preset.id === diamondWordBulletPresetId
    );

    expect(decimalDot?.scope).toBe("singleLevel");
    expect(decimalDot?.scope === "singleLevel" && decimalDot.level).toMatchObject({
      format: "decimal",
      text: "%1.",
      suffix: "tab",
      justification: "start",
      restartAfterLevel: null
    });
    expect(parenthesizedLetter?.scope === "singleLevel"
      && parenthesizedLetter.level).toMatchObject({
      format: "lowerLetter",
      text: "(%1)"
    });
    expect(enclosedCircle?.scope === "singleLevel"
      && enclosedCircle.level).toMatchObject({
      format: "decimalEnclosedCircleChinese",
      text: "%1"
    });
    expect(diamond?.scope === "singleLevel" && diamond.level).toMatchObject({
      format: "bullet",
      text: "◆"
    });

    expect(mixed?.scope).toBe("multilevel");
    expect(mixed?.scope === "multilevel"
      && Object.keys(mixed.levels)).toEqual([
      "0", "1", "2", "3", "4", "5", "6", "7", "8"
    ]);
    expect(mixed?.scope === "multilevel" && [
      mixed.levels["0"]?.format,
      mixed.levels["1"]?.format,
      mixed.levels["2"]?.format
    ]).toEqual(["decimal", "lowerLetter", "lowerRoman"]);
    expect(mixed?.scope === "multilevel" && [
      mixed.levels["0"]?.text,
      mixed.levels["1"]?.text,
      mixed.levels["2"]?.text
    ]).toEqual(["%1.", "(%2)", "(%3)"]);
    expect(mixedEnclosed?.scope === "multilevel" && [
      mixedEnclosed.levels["0"]?.format,
      mixedEnclosed.levels["1"]?.format,
      mixedEnclosed.levels["2"]?.format
    ]).toEqual(["decimal", "decimal", "decimalEnclosedCircleChinese"]);
    expect(mixedEnclosed?.scope === "multilevel" && [
      mixedEnclosed.levels["0"]?.text,
      mixedEnclosed.levels["1"]?.text,
      mixedEnclosed.levels["2"]?.text
    ]).toEqual(["%1.", "(%2)", "%3"]);
    expect(office?.scope === "multilevel" && [
      office.levels["0"]?.format,
      office.levels["1"]?.format,
      office.levels["2"]?.format,
      office.levels["3"]?.format
    ]).toEqual(["upperRoman", "upperLetter", "decimal", "lowerLetter"]);
    expect(office?.scope === "multilevel" && [
      office.levels["0"]?.text,
      office.levels["1"]?.text,
      office.levels["2"]?.text,
      office.levels["3"]?.text
    ]).toEqual(["%1.", "%2.", "%3.", "%4)"]);
  });
});
