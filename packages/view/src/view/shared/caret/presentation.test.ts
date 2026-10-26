import { describe, expect, it } from "vitest";
import {
  resolveMountedCaretOmitsOverlayCaret,
  resolveMountedCaretPresentation
} from "./presentation";

describe("resolveMountedCaretPresentation", () => {
  it("blinks while focused and editable in blink mode", () => {
    expect(resolveMountedCaretPresentation("blink", true, true)).toEqual({
      visible: true,
      blinking: true
    });
  });

  it("stays visible without blinking while editable but unfocused", () => {
    expect(resolveMountedCaretPresentation("blink", false, true)).toEqual({
      visible: true,
      blinking: false
    });
  });

  it("hides in blink mode for read-only views", () => {
    expect(resolveMountedCaretPresentation("blink", true, false)).toEqual({
      visible: false,
      blinking: false
    });
  });

  it("keeps a steady caret regardless of focus", () => {
    expect(resolveMountedCaretPresentation("steady", false, true)).toEqual({
      visible: true,
      blinking: false
    });
  });

  it("never shows in hidden mode", () => {
    expect(resolveMountedCaretPresentation("hidden", true, true)).toEqual({
      visible: false,
      blinking: false
    });
  });
});

describe("resolveMountedCaretOmitsOverlayCaret", () => {
  it("omits the overlay caret for the default (dom) rendering mode", () => {
    expect(resolveMountedCaretOmitsOverlayCaret(undefined)).toBe(true);
    expect(resolveMountedCaretOmitsOverlayCaret("dom")).toBe(true);
  });

  it("keeps the overlay caret for the overlay fallback", () => {
    expect(resolveMountedCaretOmitsOverlayCaret("overlay")).toBe(false);
  });
});
