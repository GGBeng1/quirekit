import { describe, expect, it } from "vitest";
import type { QuireLayoutProvider } from "./types";
import { createQuireLayoutProviderRegistry } from "./registry";

describe("layout provider registry", () => {
  it("resolves a unique provider by supported node type", () => {
    const provider = createProvider("container-flow", ["callout"]);
    const result = createQuireLayoutProviderRegistry([provider]);

    expect(result).toMatchObject({ valid: true });
    if (result.valid) {
      expect(result.registry.resolve("callout")).toBe(provider);
      expect(result.registry.resolve("paragraph")).toBeUndefined();
    }
  });

  it("rejects duplicate provider ids", () => {
    const result = createQuireLayoutProviderRegistry([
      createProvider("container-flow", ["callout"]),
      createProvider("container-flow", ["quote"])
    ]);

    expect(result).toMatchObject({
      valid: false,
      gaps: [{ code: "duplicate-provider-id", providerId: "container-flow" }]
    });
  });

  it("rejects ambiguous node type ownership instead of using provider order", () => {
    const result = createQuireLayoutProviderRegistry([
      createProvider("first-provider", ["callout"]),
      createProvider("second-provider", ["callout"])
    ]);

    expect(result).toMatchObject({
      valid: false,
      gaps: [{
        code: "ambiguous-node-provider",
        nodeType: "callout",
        providerIds: ["first-provider", "second-provider"]
      }]
    });
  });
});

/**
 * Creates a registry provider fixture whose layout function is not executed.
 *
 * @param id - Stable provider id.
 * @param nodeTypes - Supported node types.
 * @returns Provider fixture.
 */
function createProvider(
  id: string,
  nodeTypes: readonly string[]
): QuireLayoutProvider {
  return {
    id,
    nodeTypes,
    capabilities: ["child-flow"],
    regionContract: {
      rootKind: "block-container",
      regionKind: "block-container",
      capabilities: {
        editable: true,
        selectable: true,
        focusable: true,
        copyable: true,
        commandable: true,
        accessible: true
      },
      selectionPolicy: "delegate-to-text"
    },
    layout: () => {
      throw new Error("Registry tests must not execute layout providers.");
    }
  };
}
