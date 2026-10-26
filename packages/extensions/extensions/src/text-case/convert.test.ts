import { describe, expect, it } from "vitest";
import { convertTextCaseUnits, mapTextWidth } from "./convert";
import type { TextCaseMode } from "./types";

/**
 * Converts a whole string as if fully selected.
 * @param text - Source text.
 * @param mode - Rewrite mode.
 * @returns Rewritten text.
 */
function convert(text: string, mode: TextCaseMode): string {
  return convertTextCaseUnits([...text].map((char, pos) => ({ char, pos, target: true })), mode).join("");
}

describe("text case conversion", () => {
  it("covers the five case modes", () => {
    expect(convert("hELLO wORLD", "lower")).toBe("hello world");
    expect(convert("hello world", "upper")).toBe("HELLO WORLD");
    expect(convert("hELLO wORLD", "toggle")).toBe("Hello World");
    expect(convert("hELLO wORLD it's", "capitalize")).toBe("Hello World It's");
    expect(convert("HELLO WORLD. THIS IS 3.5 MM! 再见。OK", "sentence")).toBe("Hello world. This is 3.5 mm! 再见。Ok");
  });

  it("maps ASCII, space and signs between halfwidth and fullwidth", () => {
    expect(convert("Ab1 ,¥", "fullwidth")).toBe("Ａｂ１　，￥");
    expect(convert("Ａｂ１　，￥中", "halfwidth")).toBe("Ab1 ,¥中");
    expect(mapTextWidth("中", "fullwidth")).toBe("中");
  });

  it("decides word starts from unselected context", () => {
    const units = [..."hello"].map((char, pos) => ({ char, pos, target: pos >= 2 }));
    expect(convertTextCaseUnits(units, "capitalize").join("")).toBe("Hello");
  });

  it("treats inline atoms as word separators", () => {
    const units = [{ char: "a", pos: 0, target: true }, { char: " ", pos: -1, target: false }, { char: "b", pos: 2, target: true }];
    expect(convertTextCaseUnits(units, "capitalize").join("")).toBe("A B");
  });
});
