import { describe, expect, it } from "vitest";
import { createQuireSelectionAdapterRegistry } from "./registry";
import type { QuireSelectionAdapterEntry } from "./types";

interface TestSelectionAdapter {
  /** Fixture preset used to identify a semantic consumer. */
  readonly preset: "word-table" | "atomic-block" | "custom-layout";
}

describe("selection adapter registry", () => {
  it("orders adapters by priority and keeps declaration order stable", () => {
    const entries: readonly QuireSelectionAdapterEntry<TestSelectionAdapter>[] = [
      {
        id: "custom-layout",
        nodeTypes: ["consumerCallout"],
        priority: 50,
        adapter: { preset: "custom-layout" },
        extensionName: "consumer-layout"
      },
      {
        id: "word-table",
        nodeTypes: ["table"],
        priority: 200,
        adapter: { preset: "word-table" },
        extensionName: "word-table"
      },
      {
        id: "atomic-image",
        nodeTypes: ["image"],
        priority: 100,
        adapter: { preset: "atomic-block" },
        extensionName: "image"
      }
    ];

    const result = createQuireSelectionAdapterRegistry(entries);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.registry.entries.map((entry) => entry.id)).toEqual([
        "word-table",
        "atomic-image",
        "custom-layout"
      ]);
      expect(result.registry.getByNodeType("table")?.id).toBe("word-table");
      expect(result.registry.getById("atomic-image")?.adapter.preset)
        .toBe("atomic-block");
    }
  });

  it("uses lower-priority adapters as deterministic fallbacks", () => {
    const fallback: QuireSelectionAdapterEntry<TestSelectionAdapter> = {
      id: "generic-table",
      nodeTypes: ["table"],
      priority: 10,
      adapter: { preset: "custom-layout" },
      extensionName: "generic-structure"
    };
    const preferred: QuireSelectionAdapterEntry<TestSelectionAdapter> = {
      id: "word-table",
      nodeTypes: ["table"],
      priority: 200,
      adapter: { preset: "word-table" },
      extensionName: "word-table"
    };
    const result = createQuireSelectionAdapterRegistry([fallback, preferred]);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.registry.getByNodeType("table")).toBe(preferred);
      expect(result.registry.getCandidatesByNodeType("table")).toEqual([
        preferred,
        fallback
      ]);
    }
  });

  it("rejects duplicate stable ids", () => {
    const result = createQuireSelectionAdapterRegistry([
      {
        id: "shared",
        nodeTypes: ["table"],
        adapter: { preset: "word-table" },
        extensionName: "first"
      },
      {
        id: "shared",
        nodeTypes: ["image"],
        adapter: { preset: "atomic-block" },
        extensionName: "second"
      }
    ]);

    expect(result).toMatchObject({
      valid: false,
      gaps: [{ code: "duplicate-selection-adapter-id", id: "shared" }]
    });
  });

  it("rejects equal-priority ownership for the same node type", () => {
    const result = createQuireSelectionAdapterRegistry([
      {
        id: "first",
        nodeTypes: ["consumerCallout"],
        priority: 100,
        adapter: { preset: "custom-layout" },
        extensionName: "first"
      },
      {
        id: "second",
        nodeTypes: ["consumerCallout"],
        priority: 100,
        adapter: { preset: "atomic-block" },
        extensionName: "second"
      }
    ]);

    expect(result).toMatchObject({
      valid: false,
      gaps: [{
        code: "ambiguous-node-selection-adapter",
        nodeType: "consumerCallout",
        priority: 100
      }]
    });
  });

  it("does not retain adapters after a registry is rebuilt without them", () => {
    const entry: QuireSelectionAdapterEntry<TestSelectionAdapter> = {
      id: "temporary",
      nodeTypes: ["temporaryNode"],
      adapter: { preset: "custom-layout" },
      extensionName: "temporary-extension"
    };
    const installed = createQuireSelectionAdapterRegistry([entry]);
    const uninstalled = createQuireSelectionAdapterRegistry([]);

    expect(installed.valid && installed.registry.getById("temporary")).toBe(entry);
    expect(uninstalled.valid).toBe(true);
    if (uninstalled.valid) {
      expect(uninstalled.registry.entries).toEqual([]);
      expect(uninstalled.registry.getById("temporary")).toBeUndefined();
    }
  });
});
