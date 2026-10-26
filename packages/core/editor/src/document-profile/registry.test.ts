import { describe, expect, it } from "vitest";
import { Extension, Node, QuireExtensionManager } from "../index";
import { createQuireDocumentProfileRegistry } from "./registry";

describe("document-profile registration", () => {
  it("looks up the owner of each facet deterministically", () => {
    const pages = { id: "pages", facets: ["page-sections"], profile: 1, extensionName: "pages-extension" };
    const text = { id: "text", facets: ["paragraph-style", "list-markers"], profile: 2, extensionName: "text-extension" };
    const result = createQuireDocumentProfileRegistry([pages, text]);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.registry.entries).toEqual([pages, text]);
      expect(result.registry.getByFacet("page-sections")).toBe(pages);
      expect(result.registry.getByFacet("list-markers")).toBe(text);
      expect(result.registry.getByFacet("missing")).toBeUndefined();
    }
  });

  it("collects profiles from extensions and node extensions in execution order", () => {
    const manager = new QuireExtensionManager([
      Extension.create({
        name: "profile-extension",
        addDocumentProfiles: () => [{ id: "extension-profile", facets: ["page-sections"], profile: "a" }]
      }),
      Node.create({
        name: "profileNode",
        group: "block",
        content: "text*",
        addDocumentProfiles: () => [{ id: "node-profile", facets: ["list-markers"], profile: "b" }]
      })
    ]);

    expect(manager.documentProfiles.map((entry) => [entry.id, entry.extensionName])).toEqual([
      ["extension-profile", "profile-extension"],
      ["node-profile", "profileNode"]
    ]);
    expect(manager.documentProfileRegistry?.getByFacet("list-markers")?.profile).toBe("b");
  });

  it("reports duplicate profile ids as errors without fallback", () => {
    const manager = new QuireExtensionManager([
      Extension.create({
        name: "first-profile-extension",
        addDocumentProfiles: () => [{ id: "shared", facets: ["page-sections"], profile: 1 }]
      }),
      Extension.create({
        name: "second-profile-extension",
        addDocumentProfiles: () => [{ id: "shared", facets: ["list-markers"], profile: 2 }]
      })
    ]);

    expect(manager.documentProfileRegistry).toBeNull();
    expect(manager.diagnostics).toContainEqual(expect.objectContaining({
      code: "duplicate-document-profile-id",
      profileId: "shared",
      severity: "error"
    }));
  });

  it("reports a facet with two owners as an error without priority fallback", () => {
    const manager = new QuireExtensionManager([
      Extension.create({
        name: "high-profile-extension",
        priority: 100,
        addDocumentProfiles: () => [{ id: "high", facets: ["paragraph-style"], profile: 1 }]
      }),
      Extension.create({
        name: "low-profile-extension",
        priority: 1,
        addDocumentProfiles: () => [{ id: "low", facets: ["paragraph-style"], profile: 2 }]
      })
    ]);

    expect(manager.documentProfileRegistry).toBeNull();
    expect(manager.diagnostics).toContainEqual(expect.objectContaining({
      code: "ambiguous-document-profile-facet",
      facet: "paragraph-style",
      severity: "error"
    }));
  });
});
