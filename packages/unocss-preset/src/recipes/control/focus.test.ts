import { createGenerator } from "@unocss/core";
import { beforeAll, describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../../preset/config";

const fields = [
  ["Input", ".qk-input", ".qk-input--invalid:focus-within"],
  ["Textarea", ".qk-textarea", ".qk-textarea--invalid:focus-within"],
  ["InputNumber", ".qk-input-number__control", ".qk-input-number__control--invalid:focus-within"],
  ["Select", ".qk-select__trigger", ".qk-select__trigger:focus-within[data-invalid]"],
  ["Combobox", ".qk-combobox__control", ".qk-combobox__control:focus-within[data-invalid]"],
  ["TagsInput", ".qk-tags-input__control", ".qk-tags-input--invalid:focus-within .qk-tags-input__control"]
] as const;
let css = "";

/**
 * Reads declarations attached to the actual public selector in generated CSS.
 * @param selector - Public anatomy and state selector to inspect.
 * @returns Combined declarations, including selectors grouped by UnoCSS.
 */
function declarationsFor(selector: string): string {
  return [...css.matchAll(/([^{}]+)\{([^{}]+)\}/gu)]
    .filter(match => match[1]!.split(",").some(value => value.trim() === selector))
    .map(match => match[2]!)
    .join(";");
}

beforeAll(async () => {
  const generator = await createGenerator(defineQuireKitUnoConfig({ defaultTokens: false }));
  ({ css } = await generator.generate(""));
});

describe("compound field focus contract", () => {
  it.each(fields)("keeps %s focus inset and validation visible without changing geometry", (_name, control, invalid) => {
    const focused = declarationsFor(`${control}:focus-within`);
    expect(focused).toContain("outline-width:var(--qk-border-width-default)");
    expect(focused).toContain("outline-style:solid");
    expect(focused).toContain("outline-color:var(--qk-color-border-focus)");
    expect(focused).toContain("outline-offset:calc(-1 * var(--qk-border-width-default))");
    expect(focused).not.toMatch(/(?:^|;)(?:padding|margin|height|width|border-width|box-shadow):/u);

    // The invalid state owns only the color. Its priority must survive the
    // ordinary focus rule while preserving the common contour and inset.
    const invalidFocused = declarationsFor(invalid);
    expect(invalidFocused).toContain("outline-color:var(--qk-color-danger-text) !important");
    expect(invalidFocused).not.toMatch(/(?:^|;)outline(?:-style|-width|-offset)?:/u);
  });

  it("does not add a halo to standalone clipboard and editable fields", () => {
    for (const selector of ['.qk-clipboard__input:focus-visible', '.qk-editable__input']) {
      expect(declarationsFor(selector)).not.toMatch(/(?:box-shadow|--un-ring-width):/u);
    }
  });

  it("keeps disabled native placeholders more specific than available empty fields", () => {
    for (const field of ["input__field", "textarea__field", "input-number__input", "combobox__input", "tags-input__input"]) {
      const available = declarationsFor(`.qk-${field}::placeholder`);
      expect(available).toContain("color:var(--qk-color-text-placeholder)");
      expect(available).toContain("opacity:1");
      const disabled = declarationsFor(`.qk-${field}:disabled::placeholder`);
      expect(disabled).toContain("color:var(--qk-color-text-disabled)");
      expect(disabled).not.toMatch(/(?:^|;)opacity:/u);
    }
  });

  it("excludes disabled Select triggers from empty-value coloring", () => {
    expect(declarationsFor(".qk-select__trigger[data-placeholder-shown]:not([data-disabled])"))
      .toContain("color:var(--qk-color-text-placeholder)");
    expect(declarationsFor(".qk-select__trigger:disabled"))
      .toContain("color:var(--qk-color-text-disabled)");
    expect(declarationsFor(".qk-select__trigger[data-placeholder-shown]")).toBe("");
  });
});
