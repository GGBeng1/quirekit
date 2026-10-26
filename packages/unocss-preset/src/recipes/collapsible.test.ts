import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";
import { collapsibleRecipeCatalog, collapsibleShortcuts } from "./collapsible";

describe("collapsible recipe", () => {
  it("publishes the complete anatomy catalog", () => {
    expect(collapsibleRecipeCatalog).toContain("qk-collapsible__indicator");
    expect(collapsibleRecipeCatalog).toContain("qk-collapsible__content");
  });

  it("rotates the indicator only in the open state", () => {
    const indicator = collapsibleShortcuts.find(([name]) => name === "qk-collapsible__indicator");
    expect(JSON.stringify(indicator)).toContain("data-[state=open]:rotate-90");
  });

  it("keeps trigger text away from its vertical edges", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("qk-collapsible__trigger", { preflights: true });

    expect(result.css).toContain("padding-top:var(--qk-space-inline)");
    expect(result.css).toContain("padding-bottom:var(--qk-space-inline)");
  });
});
