import { describe, expect, it } from "vitest";
import type { QuireLayoutNode, QuireLayoutPage } from "../types";
import {
  createQuireLayoutInteractionQueryIndex,
  filterQuireLayoutInteractionQueryEntriesToShallowest,
  queryQuireLayoutInteractionQueryIndexAtPoint,
  queryQuireLayoutInteractionQueryIndexInRect,
  resolveQuireLayoutInteractionQueryEntryNode,
  resolveQuireLayoutInteractionQueryEntryNodes
} from "./snapshot";

describe("layout interaction query index", () => {
  it("narrows point queries to the containing page bucket", () => {
    const root = createIndexedRoot();
    const index = createQuireLayoutInteractionQueryIndex({
      root,
      pages: createPages()
    });

    expect(index?.entryCount).toBe(4);

    const entries = queryQuireLayoutInteractionQueryIndexAtPoint(
      expectDefined(index),
      { x: 24, y: 132 }
    );

    expect(entries.map((entry) => entry.nodeId)).toEqual([
      "page-1-block",
      "page-1-inline"
    ]);
    expect(
      resolveQuireLayoutInteractionQueryEntryNodes(
        root,
        filterQuireLayoutInteractionQueryEntriesToShallowest(entries)
      ).map((node) => node.id)
    ).toEqual(["page-1-block"]);
  });

  it("narrows rect queries across intersecting page buckets without duplicate entries", () => {
    const root = createIndexedRoot();
    const index = expectDefined(createQuireLayoutInteractionQueryIndex({
      root,
      pages: createPages()
    }));

    const entries = queryQuireLayoutInteractionQueryIndexInRect(index, {
      x: 0,
      y: 80,
      width: 300,
      height: 80
    });

    expect(entries.map((entry) => entry.nodeId)).toEqual([
      "page-0-footer",
      "page-1-block",
      "page-1-inline"
    ]);
  });

  it("uses the snapshot viewport as the coarse bucket for unpaginated snapshots", () => {
    const root = createIndexedRoot();
    const index = expectDefined(createQuireLayoutInteractionQueryIndex({
      root,
      viewportRect: { x: 0, y: 0, width: 300, height: 100 }
    }));

    expect(index.buckets).toEqual([
      {
        bucketId: "viewport:snapshot",
        rect: { x: 0, y: 0, width: 300, height: 100 },
        entryIndexes: [0]
      }
    ]);
    expect(index.unbucketedEntryIndexes).toEqual([1, 2, 3]);
  });

  it("resolves node paths without storing node object references", () => {
    const root = createIndexedRoot();
    const index = expectDefined(createQuireLayoutInteractionQueryIndex({
      root,
      pages: createPages()
    }));
    const entry = expectDefined(
      index.entries.find((candidate) => candidate.nodeId === "page-1-inline")
    );

    expect(resolveQuireLayoutInteractionQueryEntryNode(root, entry)?.id).toBe(
      "page-1-inline"
    );
    expect(resolveQuireLayoutInteractionQueryEntryNode({
      ...root,
      children: (root.children ?? []).map((node) =>
        node.id === "page-1-block"
          ? {
              ...node,
              ...(node.children === undefined
                ? {}
                : {
                    children: node.children.map((child) => ({
                      ...child,
                      id: "changed"
                    }))
                  })
            }
          : node
      )
    }, entry)).toBeNull();
  });
});

/**
 * Creates a small two-page snapshot root for query-index tests.
 *
 * @returns Layout root with nodes on two page buckets.
 */
function createIndexedRoot(): QuireLayoutNode {
  return {
    id: "root",
    kind: "block",
    range: { from: 0, to: 20 },
    rect: { x: 0, y: 0, width: 300, height: 220 },
    children: [
      {
        id: "page-0-footer",
        kind: "block",
        range: { from: 1, to: 4 },
        rect: { x: 10, y: 72, width: 100, height: 20 },
        children: []
      },
      {
        id: "page-1-block",
        kind: "block",
        range: { from: 5, to: 12 },
        rect: { x: 10, y: 120, width: 180, height: 40 },
        children: [
          {
            id: "page-1-inline",
            kind: "inline",
            range: { from: 6, to: 10 },
            rect: { x: 20, y: 128, width: 80, height: 20 },
            children: []
          }
        ]
      },
      {
        id: "offscreen",
        kind: "block",
        range: { from: 13, to: 18 },
        rect: { x: 10, y: 260, width: 100, height: 20 },
        children: []
      }
    ]
  };
}

/**
 * Creates two page buckets for query-index tests.
 *
 * @returns Page metadata covering two document-space windows.
 */
function createPages(): readonly QuireLayoutPage[] {
  return [
    {
      pageIndex: 0,
      range: { from: 0, to: 5 },
      pageRect: { x: 0, y: 0, width: 300, height: 100 },
      bodyRect: { x: 0, y: 0, width: 300, height: 100 }
    },
    {
      pageIndex: 1,
      range: { from: 5, to: 20 },
      pageRect: { x: 0, y: 100, width: 300, height: 100 },
      bodyRect: { x: 0, y: 100, width: 300, height: 100 }
    }
  ];
}

/**
 * Unwraps an optional test value.
 *
 * @param value - Value expected to be present.
 * @returns The present value.
 */
function expectDefined<T>(value: T | undefined): T {
  expect(value).toBeDefined();

  return value as T;
}
