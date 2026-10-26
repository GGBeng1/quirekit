import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";

describe("FileUpload recipe", () => {
  it("publishes dropzone, accepted, rejected, and action anatomy", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("");

    expect(result.css).toContain(".qk-file-upload__dropzone");
    expect(result.css).toContain(".qk-file-upload__item");
    expect(result.css).toContain(".qk-file-upload__rejection");
    expect(result.css).toContain(".qk-file-upload__trigger");
    expect(result.css).toContain('.qk-file-upload__collection[data-layout="compact"]');
    expect(result.css).toContain('min-width: 44px; min-height: 44px;');
  });

  it("uses semantic drag, invalid, disabled, and focus states", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("");

    expect(result.css).toContain("[data-dragging]");
    expect(result.css).toContain("[data-disabled]");
    expect(result.css).toContain("border-color:var(--qk-color-danger-border)");
    expect(result.css).toContain(":focus-visible");
  });

  it("uses the public Button color pairs for embedded upload actions", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("qk-file-upload__trigger", { preflights: false, safelist: false });

    expect(css).toContain("color:var(--qk-button-primary-solid-foreground)");
    expect(css).toContain("background-color:var(--qk-button-primary-solid-background)");
    expect(css).toContain("background-color:var(--qk-button-primary-solid-hover-background)");
    expect(css).toContain("background-color:var(--qk-button-primary-solid-pressed-background)");
    expect(css).not.toContain("border-color:var(--qk-button-focus-color)");
    expect(css).toContain("color:var(--qk-button-disabled-foreground)");
    expect(css).not.toContain("var(--qk-color-text-inverse)");
    expect(css).not.toContain("opacity:0.9;");
  });
});
