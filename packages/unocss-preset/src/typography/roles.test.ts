import { createGenerator } from "@unocss/core";
import { themeVariableReferences } from "@quirekit/ui";
import { describe, expect, it } from "vitest";
import { generateQuireKitCss } from "../output/css";
import { defineQuireKitUnoConfig } from "../preset/config";

describe("complete typography roles", () => {
  it("publishes every role as one complete, theme-aware standalone recipe", async () => {
    const css = await generateQuireKitCss();
    for (const name of Object.keys(themeVariableReferences.typography)) {
      const role = name.replace(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`);
      const declarations = css.match(new RegExp(`\\.qk-type-${role}\\{([^}]+)\\}`))?.[1];
      expect(declarations, role).toBeDefined();
      for (const field of ["font-family", "font-size", "line-height", "font-weight", "letter-spacing"]) {
        expect(declarations, `${role}: ${field}`).toContain(`${field}:var(--qk-type-${role}-${field})`);
      }
      expect(declarations).not.toContain("color:");
    }
    expect(css).toMatch(/\.qk-type-code\{[^}]*font-variant-ligatures:none/);
  });

  it("preserves size-only utilities and lets consumers override a complete role", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig({ defaultTokens: false }));
    const { css, layers } = await generator.generate("qk-type-code text-qk-code font-qk-heading");
    const size = css.match(/\.text-qk-code\{([^}]+)\}/)?.[1];
    expect(size).toContain("font-size:var(--qk-type-code-font-size)");
    expect(size).toContain("line-height:var(--qk-type-code-line-height)");
    expect(size).not.toMatch(/font-(?:family|weight):/);
    expect(layers.indexOf("qk-recipes")).toBeLessThan(layers.indexOf("default"));
  });
});
