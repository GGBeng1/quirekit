import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";

describe("Pagination recipe", () => {
  it("publishes responsive full and compact anatomy", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("", { preflights: true });

    expect(result.css).toContain(".qk-pagination__controls");
    expect(result.css).toContain(".qk-pagination__compact-label");
    expect(result.css).toMatch(/\.qk-pagination__controls\{[^}]*flex-wrap:wrap/);
    expect(result.css).toMatch(/\.qk-pagination__controls\{[^}]*max-width:100%/);
    expect(result.css).not.toMatch(/\.qk-pagination__edge-trigger\{[^}]*display:none/);
  });

  it("keeps selected, focus and disabled states distinct", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("", { preflights: true });

    expect(result.css).toContain("[data-selected]");
    expect(result.css).toContain(":focus-visible");
    expect(result.css).toContain(":disabled");
  });
});
