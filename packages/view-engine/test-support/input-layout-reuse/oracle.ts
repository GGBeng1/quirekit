import { expect } from "vitest";
import { deriveQuireLayoutDirtyRangeFromTransactions, deriveQuireViewUpdatePatch } from "../../src/invalidation";
import type { QuireLayoutNode } from "../../src/layout";
import { createQuireViewEngineRuntime } from "../../src/frame/runtime";
import type { QuireViewEngineFrame } from "../../src/frame/types";
import type { InputLayoutFixture } from "./types";

/**
 * Compares a retained input frame with a runtime containing no earlier cache entry.
 * @param fixture - Source editor and warm runtime.
 * @param label - Mutation checkpoint printed on assertion failure.
 * @returns The accepted frame after its complete consumer products match.
 */
export function expectFreshInputLayout(fixture: InputLayoutFixture, label: string): QuireViewEngineFrame {
  const transactions = fixture.transactions.splice(0);
  const layoutDirtyRange = deriveQuireLayoutDirtyRangeFromTransactions(transactions);
  const frame = fixture.runtime.buildFrame({
    ...fixture.options,
    layoutDirtyRange,
    updatePatch: deriveQuireViewUpdatePatch({ reason: "transaction", transactions, layoutDirtyRange })
  });
  // A fresh runtime owns new shape, measured-source, pagination and display caches.
  // Unknown metadata on the retained runtime would not establish this oracle.
  const full = createQuireViewEngineRuntime({ editor: fixture.editor }).buildFrame(fixture.options);
  expect(frame.layoutSnapshot.state.doc, label).toBe(fixture.editor.state.doc);
  expectInputFrameProducts(frame, full, label);
  return frame;
}

/**
 * Compares complete consumer products with an independently built frame.
 * @param frame - Retained accepted or speculative frame under test.
 * @param full - Fresh-runtime reference with the same exact source inputs.
 * @param label - Mutation checkpoint printed on assertion failure.
 */
export function expectInputFrameProducts(
  frame: QuireViewEngineFrame,
  full: QuireViewEngineFrame,
  label: string
): void {
  const expected = snapshotProducts(full);
  for (const [product, actual] of Object.entries(snapshotProducts(frame))) {
    expect(normalizeSnapshotGeneration(actual), `${label}: ${product}`)
      .toEqual(normalizeSnapshotGeneration(expected[product]));
  }
}

/**
 * Captures geometry, ownership and complete paint without cache diagnostics.
 * @param frame - Accepted frame from either independent path.
 * @returns Complete consumer values before removing generation and callable identities.
 */
function snapshotProducts(frame: QuireViewEngineFrame): Record<string, unknown> {
  return {
    documentRect: frame.layoutSnapshot.documentRect,
    pages: frame.layoutSnapshot.pages,
    root: nodeProducts(frame.layoutSnapshot.root),
    hitTargets: frame.interactionSnapshot.hitTargets,
    interactionQueryIndex: frame.interactionSnapshot.interactionQueryIndex,
    selection: frame.layoutSnapshot.state.pm.selection.toJSON(),
    geometry: frame.selectionGeometry,
    content: frame.contentDisplayList,
    overlay: frame.overlayDisplayList,
    targets: frame.viewTargets,
    domOverlays: frame.domOverlays
  };
}

/**
 * Preserves every node's text/query products and exact owner/occurrence identity.
 * @param node - Current projected node.
 * @returns Comparable layout tree without runtime query indexes.
 */
function nodeProducts(node: QuireLayoutNode): unknown {
  return {
    id: node.id, kind: node.kind, range: node.range, rect: node.rect,
    paintTransform: node.paintTransform, paintBounds: node.paintBounds,
    interactionRole: node.interactionRole, viewRoot: node.viewRoot,
    viewRegion: node.viewRegion, layoutOwner: node.layoutOwner,
    textFragments: node.textFragments, textRuns: node.textRuns, table: node.table,
    queryProducts: node.subLayoutQueryProducts,
    children: node.children?.map(nodeProducts)
  };
}

/**
 * Omits snapshot generations and callable inputs; identifiers and ranges remain exact.
 * Table cell source boxes carry reflow/reflowInlineReplacements closures whose
 * identities differ between runtimes. Their measured fragments and all resulting
 * query and display products remain in the comparison.
 * @param value - Product value; non-plain objects retain their original semantics.
 * @returns Recursively comparable products.
 */
function normalizeSnapshotGeneration(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeSnapshotGeneration);
  if (value === null || typeof value !== "object"
    || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key, nested]) => (
    key !== "snapshotVersion" && typeof nested !== "function"
  ))
    .map(([key, nested]) => [key, normalizeSnapshotGeneration(nested)]));
}
