import { describe, expect, it } from "vitest";
import {
  resolveClassicEditorAnchoredOverlayStyle,
  resolveClassicEditorAnchoredOverlayTransform
} from "./position";

describe("Classic Editor anchored overlay positioning", () => {
  it("projects pre-resolved object placement without a second translation or gap", () => {
    expect(resolveClassicEditorAnchoredOverlayStyle({ x: 160, y: 240 }, "exact")).toEqual({
      position: "absolute", left: "160px", top: "240px", transform: "none", pointerEvents: "auto"
    });
  });
  it("places selection tools above their center anchor", () => {
    expect(resolveClassicEditorAnchoredOverlayStyle(
      { x: 320, y: 480 },
      "top"
    )).toEqual({
      position: "absolute",
      left: "320px",
      top: "480px",
      transform: "translate(-50%, calc(-100% - 8px))",
      pointerEvents: "auto"
    });
  });

  it("supports logical edge alignments without measuring the surface", () => {
    expect(resolveClassicEditorAnchoredOverlayTransform("right-start"))
      .toBe("translate(8px, 0)");
    expect(resolveClassicEditorAnchoredOverlayTransform("bottom-end"))
      .toBe("translate(-100%, 8px)");
    expect(resolveClassicEditorAnchoredOverlayTransform("left-end"))
      .toBe("translate(calc(-100% - 8px), -100%)");
  });
});
