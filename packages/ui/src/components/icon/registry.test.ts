import { describe, expect, it } from "vitest";
import { defineQuireKitIcon } from "./define";
import { createQuireKitIconRegistry } from "./registry";

const icon = defineQuireKitIcon({
  svg: '<svg viewBox="0 0 24 24"><path d="M4 12h16"/></svg>',
  source: "custom",
  license: "QuireKit"
});

describe("QuireKit icon registry", () => {
  it("resolves canonical names, aliases, and an explicit fallback", () => {
    const registry = createQuireKitIconRegistry(
      { minus: icon, missing: icon },
      { aliases: { remove: "minus" }, fallback: "missing" }
    );

    expect(registry.names).toEqual(["minus", "missing"]);
    expect(registry.has("remove")).toBe(true);
    expect(registry.has("unknown")).toBe(false);
    expect(registry.resolve("remove")).toBe(icon);
    expect(registry.resolve("unknown")).toBe(icon);
  });

  it("does not silently substitute an unknown icon without a fallback", () => {
    const registry = createQuireKitIconRegistry({ minus: icon });
    expect(registry.resolve("unknown")).toBeUndefined();
  });

  it("rejects aliases whose targets are not registered", () => {
    expect(() => createQuireKitIconRegistry(
      { minus: icon },
      { aliases: { remove: "missing" as "minus" } }
    )).toThrow(/unknown icon/u);
  });
});
