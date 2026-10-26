import { describe, expect, it } from "vitest";
import { compileExtensions } from "./compile";
import { defineExtension } from "./define";

describe("extension author contracts", () => {
  it("keeps configured definitions independent and extends contributions explicitly", () => {
    const base = defineExtension({ id: "sample", options: { width: 10 }, setup: options => ({ priority: options.width }) });
    const configured = base.configure({ width: 20 });
    expect(base.options.width).toBe(10);
    expect(configured.options.width).toBe(20);
    expect(configured.extend({ priority: 5 }).priority).toBe(5);
    expect(configured.priority).toBe(20);
  });
  it("resolves dependencies before priority and keeps stable ties", () => {
    const compiled = compileExtensions([{ id: "consumer", requires: ["base"], priority: 1000 },
      { id: "a" }, { id: "b" }, { id: "base", priority: 1 }]);
    expect(compiled.ordered.map(extension => extension.id)).toEqual(["a", "b", "base", "consumer"]);
  });
  it("rejects cycles and duplicate commands before mounting", () => {
    expect(() => compileExtensions([{ id: "a", requires: ["b"] }, { id: "b", requires: ["a"] }])).toThrow("dependency-cycle");
    const commands = { sample: () => () => null };
    expect(() => compileExtensions([{ id: "a", commands }, { id: "b", commands }])).toThrow("duplicate-command");
  });
  it("expands presets without silently dropping duplicates", () => {
    expect(compileExtensions([{ id: "kit", includes: [{ id: "a" }] }]).ordered.map(x => x.id)).toEqual(["kit", "a"]);
    expect(() => compileExtensions([{ id: "kit", includes: [{ id: "a" }] }, { id: "a" }])).toThrow("duplicate-extension");
  });
});
