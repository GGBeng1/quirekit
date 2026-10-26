import { describe, expect, it } from "vitest";
import type { QuireLayoutNode } from "../layout";
import { createQuireLayoutNodeQueryProductOwner } from "./layout-node-owner";

describe("ordinary layout-node query ownership", () => {
  it("keeps the logical source stable and the repeated occurrence page-local", () => {
    expect(createQuireLayoutNodeQueryProductOwner(createOwnedNode())).toEqual({
      sourceRootId: "word-story:footer-default",
      sourceFragmentId: "page:2:word-story:footer-default",
      coordinateSpace: "document",
      region: {
        rootId: { value: "root:word-story:footer-default" },
        regionId: { value: "region:word-story:footer-default" },
        kind: "footer",
        visualInstanceId: "page:2:word-story:footer-default"
      }
    });
  });

  it("does not invent ownership for anonymous layout geometry", () => {
    expect(createQuireLayoutNodeQueryProductOwner({
      id: "anonymous",
      kind: "block",
      range: { from: 0, to: 2 },
      rect: { x: 0, y: 0, width: 100, height: 24 },
      children: []
    })).toBeUndefined();
  });
});

/**
 * Creates one repeated footer layout node with complete retained ownership.
 *
 * @returns Owned layout node fixture.
 */
function createOwnedNode(): QuireLayoutNode {
  const region = {
    rootId: { value: "root:word-story:footer-default" },
    regionId: { value: "region:word-story:footer-default" },
    kind: "footer" as const,
    visualInstanceId: "page:2:word-story:footer-default"
  };

  return {
    id: "footer-default:page:2",
    kind: "block",
    range: { from: 20, to: 28 },
    rect: { x: 20, y: 226, width: 180, height: 24 },
    layoutOwner: {
      region,
      source: {
        sourceId: "word-story:footer-default",
        range: { from: 20, to: 28 }
      },
      capabilities: {
        editable: true,
        selectable: true,
        focusable: true,
        copyable: true,
        commandable: true,
        accessible: true
      }
    },
    children: []
  };
}
