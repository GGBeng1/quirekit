import { describe, expect, it } from "vitest";
import {
  resolveWordParagraphBlockSpacing,
  resolveWordParagraphLineMetrics
} from "./spacing";

describe("Word paragraph spacing projection", () => {
  it("keeps the Word fixed baseline when the font exceeds its line box", () => {
    expect(resolveWordParagraphLineMetrics(
      { rule: "exact", value: 150 }, 20, 15
    )).toEqual({ lineHeight: 10, baselineOffset: 8, mode: "exact" });
  });
  it("projects auto spacing from 240ths of the natural line", () => {
    expect(
      resolveWordParagraphLineMetrics(
        { rule: "auto", value: 360 },
        20,
        15
      )
    ).toEqual({
      lineHeight: 30,
      baselineOffset: 20,
      mode: "minimum"
    });
  });

  it("keeps exact and at-least physical rules distinct", () => {
    expect(
      resolveWordParagraphLineMetrics(
        { rule: "exact", value: 360 },
        20,
        15
      )
    ).toEqual({
      lineHeight: 24,
      baselineOffset: expect.closeTo(19.2, 10),
      mode: "exact"
    });
    expect(
      resolveWordParagraphLineMetrics(
        { rule: "atLeast", value: 180 },
        20,
        15
      )
    ).toEqual({
      lineHeight: 20,
      baselineOffset: 15,
      mode: "minimum"
    });
  });

  it("projects paragraph before and after twips into CSS pixels", () => {
    expect(
      resolveWordParagraphBlockSpacing({
        before: { unit: "dxa", value: 120 },
        beforeLines: null,
        beforeAutoSpacing: null,
        after: { unit: "dxa", value: 240 },
        afterLines: null,
        afterAutoSpacing: null,
        line: null
      }, 20)
    ).toEqual({ before: 8, after: 16 });
  });

  it("lets non-zero line-unit spacing override physical paragraph spacing", () => {
    expect(
      resolveWordParagraphBlockSpacing({
        before: { unit: "dxa", value: 159 },
        beforeLines: 50,
        beforeAutoSpacing: false,
        after: { unit: "dxa", value: 240 },
        afterLines: 25,
        afterAutoSpacing: null,
        line: null
      } as never, 63.6)
    ).toEqual({ before: 31.8, after: 15.9 });
  });

  it("keeps physical spacing when a line-unit value is zero", () => {
    expect(
      resolveWordParagraphBlockSpacing({
        before: { unit: "dxa", value: 159 },
        beforeLines: 0,
        beforeAutoSpacing: null,
        after: null,
        afterLines: null,
        afterAutoSpacing: null,
        line: null
      } as never, 63.6)
    ).toEqual({ before: 10.6, after: 0 });
  });
});
