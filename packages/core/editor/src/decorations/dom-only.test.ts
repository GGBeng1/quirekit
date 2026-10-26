import { Plugin, DecorationSet } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { isQuireDomOnlyDecorations, markQuireDomOnlyDecorations } from "./dom-only";

describe("DOM-only decoration providers", () => {
  it("marks the bound decorations prop a view resolves", () => {
    const plugin = new Plugin({ props: { decorations: () => DecorationSet.empty } });
    expect(isQuireDomOnlyDecorations(plugin.props.decorations)).toBe(false);
    expect(markQuireDomOnlyDecorations(plugin)).toBe(plugin);
    expect(isQuireDomOnlyDecorations(plugin.props.decorations)).toBe(true);
    expect(isQuireDomOnlyDecorations(undefined)).toBe(false);
  });
});
