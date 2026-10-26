import { qkView } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import { createQuireInlineSourceCapabilityRegistry } from "@quirekit/layout/inline";
import type { QuireInlineSourceCapabilityResolver } from "./types";

describe("inline source-capability registry", () => {
  it("compiles an independent node type through the canonical declaration", () => {
    const registry = createQuireInlineSourceCapabilityRegistry([
      createDiagramResolver()
    ]);

    expect(registry.resolve({
      nodeType: "diagramAnchor",
      attrs: { objectId: "diagram-1" }
    })).toEqual({
      status: "resolved",
      placement: {
        objectId: "diagram-1",
        extent: { inlineSize: 120, blockSize: 80 },
        layoutMode: "anchored",
        anchorMovement: "move-with-text",
        inlinePlacement: { kind: "offset", reference: "anchor", offset: 0 },
        blockPlacement: { kind: "offset", reference: "line", offset: 0 },
        flowExclusion: { kind: "none" },
        paintOrder: "above-content",
        stackingOrder: 0,
        allowOverlap: true,
        constrainToRegion: true,
        lockAspectRatio: false,
        storyId: null
      },
      presentation: {
        view: qkView.surface({ id: "diagram", width: 120, height: 80 }),
        rootKind: "embed",
        semanticRole: "embed",
        search: { kind: "excluded", reason: "Diagram fixture is not searchable." },
        exportFallbacks: [{ kind: "semantic-degraded" }]
      }
    });
  });

  it("measures only the matching logical source from a candidate map without changing attrs", () => {
    const inputs: { readonly id?: string | undefined; readonly text?: string | undefined; readonly attrs: Readonly<Record<string, unknown>> }[] = [];
    const resolver = createDiagramResolver();
    const registry = createQuireInlineSourceCapabilityRegistry([{ ...resolver,
      /** @param input - Exact source and current measurement candidate. @returns Same independent geometry product. */
      resolve(input) {
        inputs.push({ id: input.sourceAnchorId, text: input.occurrenceValue, attrs: input.attrs });
        return resolver.resolve(input);
      }
    }], new Map([["first", ""], ["second", "10"]]));
    const attrs = Object.freeze({ objectId: "diagram-1" });
    registry.resolve({ nodeType: "diagramAnchor", sourceAnchorId: "first", attrs });
    registry.resolve({ nodeType: "diagramAnchor", sourceAnchorId: "second", attrs });
    registry.resolve({ nodeType: "diagramAnchor", sourceAnchorId: "third", attrs });
    expect(inputs).toEqual([{ id: "first", text: "", attrs }, { id: "second", text: "10", attrs }, { id: "third", text: undefined, attrs }]);
    expect(inputs.every(input => input.attrs === attrs)).toBe(true);
    expect(registry.resolve({ nodeType: "unclaimed", attrs })).toBeUndefined();
  });

  it("rejects duplicate exact-node claims instead of defining precedence", () => {
    expect(() => createQuireInlineSourceCapabilityRegistry([
      createDiagramResolver(),
      createDiagramResolver()
    ])).toThrow('Duplicate inline source-capability resolver for "diagramAnchor".');
  });
});

/**
 * Creates the independent non-Word acceptance consumer.
 *
 * @returns Exact-node resolver for a diagram anchor fixture.
 */
function createDiagramResolver(): QuireInlineSourceCapabilityResolver {
  return {
    nodeType: "diagramAnchor",
    resolve(input) {
      const objectId = input.attrs.objectId;
      if (typeof objectId !== "string") {
        return {
          status: "gap",
          gaps: [{
            code: "invalid-source-declaration",
            nodeType: input.nodeType,
            message: "Diagram anchor requires objectId."
          }]
        };
      }
      return {
        status: "resolved",
        placement: {
          objectId,
          extent: { inlineSize: 120, blockSize: 80 },
          layoutMode: "anchored",
          anchorMovement: "move-with-text",
          inlinePlacement: { kind: "offset", reference: "anchor", offset: 0 },
          blockPlacement: { kind: "offset", reference: "line", offset: 0 },
          flowExclusion: { kind: "none" },
          paintOrder: "above-content",
          stackingOrder: 0,
          allowOverlap: true,
          constrainToRegion: true,
          lockAspectRatio: false,
          storyId: null
        },
        presentation: {
          view: qkView.surface({ id: "diagram", width: 120, height: 80 }),
          rootKind: "embed",
          semanticRole: "embed",
          search: { kind: "excluded", reason: "Diagram fixture is not searchable." },
          exportFallbacks: [{ kind: "semantic-degraded" }]
        }
      };
    }
  };
}
