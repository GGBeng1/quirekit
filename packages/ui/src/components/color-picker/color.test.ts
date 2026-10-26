import { describe, expect, it } from "vitest";
import {
  parseQuireColor,
  quireColorPickerFallbackValue,
  serializeQuireColor
} from "./color";

describe("Color Picker color adapter", () => {
  it("serializes opaque and alpha colors without losing alpha", () => {
    expect(serializeQuireColor(parseQuireColor("#1677ff"))).toBe("#1677FF");
    expect(serializeQuireColor(parseQuireColor("#1677ff80"))).toBe("#1677FF80");
  });

  it("uses a deterministic fallback for invalid input", () => {
    expect(serializeQuireColor(parseQuireColor("not-a-color"))).toBe(
      quireColorPickerFallbackValue
    );
  });
});
