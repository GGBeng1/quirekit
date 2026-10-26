import { describe, expect, it } from "vitest";
import {
  defineQuireKitIcon,
  QUIRE_KIT_ICON_COMPLEXITY_LIMIT
} from "./define";

const checkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg>';

describe("QuireKit icon definition", () => {
  it("normalizes one currentColor glyph for the shared renderer", () => {
    const icon = defineQuireKitIcon({
      svg: checkIcon,
      source: "lucide",
      license: "ISC"
    });

    expect(icon.viewBox).toBe("0 0 24 24");
    expect(icon.source).toBe("lucide");
    expect(icon.opticalScale).toBe(1);
    expect(icon.complexity).toBe(1);
    expect(icon.svg).toContain('class="qk-icon__svg"');
    expect(icon.svg).toContain('width="100%" height="100%"');
    expect(icon.svg).toContain('aria-hidden="true"');
    expect(Object.isFrozen(icon)).toBe(true);
  });

  it("retains a reviewed optical scale for centered renderer correction", () => {
    const icon = defineQuireKitIcon({
      svg: checkIcon,
      source: "lucide",
      license: "ISC",
      opticalScale: 0.85
    });

    expect(icon.opticalScale).toBe(0.85);
  });

  it.each([0.49, 1.01, Number.NaN])("rejects invalid optical scale %s", (opticalScale) => {
    expect(() => defineQuireKitIcon({
      svg: checkIcon,
      source: "lucide",
      license: "ISC",
      opticalScale
    })).toThrow(RangeError);
  });

  it.each([
    '<svg viewBox="0 0 24 24"><script>alert(1)</script><path d="M0 0"/></svg>',
    '<svg viewBox="0 0 24 24"><image href="https://example.com/a.png"/></svg>',
    '<svg viewBox="0 0 24 24"><text>Save</text></svg>',
    '<svg viewBox="0 0 24 24" onclick="run()"><path d="M0 0"/></svg>'
  ])("rejects unsafe or non-glyph markup", (svg) => {
    expect(() => defineQuireKitIcon({
      svg,
      source: "custom",
      license: "QuireKit"
    })).toThrow();
  });

  it("rejects fixed paint so every glyph inherits the owning control color", () => {
    expect(() => defineQuireKitIcon({
      svg: '<svg viewBox="0 0 24 24" fill="#ff0000"><path d="M4 12h16"/></svg>',
      source: "custom",
      license: "QuireKit"
    })).toThrow(/fixed SVG paint/u);
  });

  it("rejects custom artwork that exceeds the compact-icon detail budget", () => {
    const paths = Array.from(
      { length: QUIRE_KIT_ICON_COMPLEXITY_LIMIT + 1 },
      (_, index) => `<path d="M${index} 0h1"/>`
    ).join("");

    expect(() => defineQuireKitIcon({
      svg: `<svg viewBox="0 0 24 24">${paths}</svg>`,
      source: "custom",
      license: "QuireKit"
    })).toThrow(RangeError);
  });
});
