import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";
import { fieldsetShortcuts } from "./fieldset";

describe("Fieldset recipe", () => {
  it("publishes legend, message, body, and orientation anatomy", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("");

    expect(result.css).toContain(".qk-fieldset__legend");
    expect(result.css).toContain(".qk-fieldset__message");
    expect(result.css).toContain(".qk-fieldset__content--vertical");
    expect(result.css).toContain(".qk-fieldset__content--horizontal");
  });

  it("keeps the optional outline neutral and hides legends accessibly", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("");

    expect(result.css).toContain("var(--qk-color-border-default)");
    expect(result.css).toContain(".qk-fieldset--disabled");
    const recipes = new Map(fieldsetShortcuts.map(([name, rule]) => [name, rule]));
    expect(recipes.get("qk-fieldset--invalid")).toBe("");
    expect(recipes.get("qk-fieldset__legend--hidden")).toBe("sr-only");
    expect(recipes.get("qk-fieldset__legend")).not.toMatch(/bg-|border-b/);
    expect(recipes.get("qk-fieldset__legend")).toContain("float-left");
  });
});
