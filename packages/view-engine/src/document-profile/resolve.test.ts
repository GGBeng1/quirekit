import { Extension, QuireExtensionManager } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { quireNeutralDocumentProfile } from "./defaults";
import {
  QuireDocumentProfileRegistrationError,
  resolveQuireDocumentProfile
} from "./resolve";
import type { QuireInlineSourceProfileFactory } from "./types";

/**
 * Creates an extension registering one document profile payload.
 *
 * @param name - Extension and profile name.
 * @param facets - Declared facet names.
 * @param profile - Opaque payload.
 * @returns Extension contributing the registration.
 */
function profileExtension(name: string, facets: readonly string[], profile: unknown) {
  return Extension.create({
    name,
    addDocumentProfiles: () => [{ id: name, facets, profile }]
  });
}

describe("document profile resolution", () => {
  it("uses neutral defaults for headless layout and compositions without profiles", () => {
    expect(resolveQuireDocumentProfile(undefined)).toBe(quireNeutralDocumentProfile);
    expect(resolveQuireDocumentProfile(new QuireExtensionManager([]))).toBe(quireNeutralDocumentProfile);
  });

  it("overrides the default with the registered facet and caches per manager", () => {
    const inlineSources: QuireInlineSourceProfileFactory = () => [];
    const manager = new QuireExtensionManager([
      profileExtension("fields", ["inline-sources"], { "inline-sources": inlineSources })
    ]);

    const resolved = resolveQuireDocumentProfile(manager);
    expect(resolved.inlineSources).toBe(inlineSources);
    expect(resolveQuireDocumentProfile(manager)).toBe(resolved);
  });

  it("rejects unknown facets instead of ignoring them", () => {
    const manager = new QuireExtensionManager([
      profileExtension("future", ["page-sections-v9"], {})
    ]);

    expect(() => resolveQuireDocumentProfile(manager)).toThrow(QuireDocumentProfileRegistrationError);
  });

  it("rejects a declared facet without an implementation", () => {
    const manager = new QuireExtensionManager([
      profileExtension("empty", ["inline-sources"], {})
    ]);

    expect(() => resolveQuireDocumentProfile(manager)).toThrow(/without an implementation/u);
  });

  it("rejects compositions Core already marked as conflicting", () => {
    const manager = new QuireExtensionManager([
      profileExtension("first", ["inline-sources"], { "inline-sources": () => [] }),
      profileExtension("second", ["inline-sources"], { "inline-sources": () => [] })
    ]);

    expect(manager.documentProfileRegistry).toBeNull();
    expect(() => resolveQuireDocumentProfile(manager)).toThrow(QuireDocumentProfileRegistrationError);
  });
});
