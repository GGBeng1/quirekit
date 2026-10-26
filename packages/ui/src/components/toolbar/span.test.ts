import { describe, expect, it } from "vitest";
import { resolveQuireKitToolbarEntrySpan, sumQuireKitToolbarSpans } from "./span";

describe("toolbar unit spans", () => {
  it("derives spans from the entry kind", () => {
    expect(resolveQuireKitToolbarEntrySpan({ value: "bold", label: "Bold", icon: "bold" })).toBe(1);
    expect(resolveQuireKitToolbarEntrySpan({ value: "insert", label: "Insert", icon: "plus", kind: "menu", trigger: "disclosure" })).toBe(1.5);
    expect(resolveQuireKitToolbarEntrySpan({ value: "more", label: "More", icon: "more", kind: "menu", trigger: "disclosure", indicator: false })).toBe(1);
    expect(resolveQuireKitToolbarEntrySpan({ value: "height", label: "Height", icon: "h", kind: "disclosure", indicator: true })).toBe(1.5);
    expect(resolveQuireKitToolbarEntrySpan({ value: "border", label: "Border", icon: "b", kind: "split" })).toBe(1.5);
  });

  it("keeps natural width for text and custom controls unless declared", () => {
    expect(resolveQuireKitToolbarEntrySpan({ value: "merge", label: "Merge", icon: "m", text: "Merge" })).toBeNull();
    expect(resolveQuireKitToolbarEntrySpan({ value: "font", label: "Font", kind: "custom" })).toBeNull();
    expect(resolveQuireKitToolbarEntrySpan({ value: "font", label: "Font", kind: "custom", span: 5 })).toBe(5);
  });

  it("sums spans through groups and skips hidden entries", () => {
    expect(sumQuireKitToolbarSpans([
      { value: "a", label: "A", icon: "a" },
      { value: "g", label: "G", kind: "group", children: [{ value: "b", label: "B", icon: "b", kind: "split" }] },
      { value: "h", label: "H", icon: "h", hidden: true }
    ])).toBe(2.5);
  });
});
