import { describe, expect, it } from "vitest";
import {
  hexToRgb,
  hsvToRgb,
  normalizeHexColor,
  rgbToHex,
  rgbToHsv
} from "./conversion";

describe("shared color conversion", () => {
  it("round-trips canonical document colors through RGB and HSV", () => {
    const rgb = hexToRgb("#1677FF");
    expect(rgb).toEqual({ blue: 255, green: 119, red: 22 });
    expect(rgbToHex(rgb)).toBe("#1677FF");
    expect(rgbToHex(hsvToRgb(rgbToHsv(rgb)))).toBe("#1677FF");
  });

  it("normalizes complete hexadecimal input and rejects partial input", () => {
    expect(normalizeHexColor(" 1677ff ")).toBe("#1677FF");
    expect(normalizeHexColor("#FFF")).toBeUndefined();
    expect(normalizeHexColor("not-a-color")).toBeUndefined();
  });
});
