import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { buildQuireLayoutSnapshot } from "../../../editor-layout";
import { createQuireBlockShapeCache } from "../block";
import { describe, expect, it, vi } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { layoutQuireBlockDocument } from "../../engine/block";
import type { QuireBlockLayoutInput } from "../../engine/block-types";
import { createQuireRetainedBlockLayoutGraph } from "../../retained-block";

/**
 * Creates a measured leaf with observable access to its local fragment source.
 *
 * @param id - Stable paragraph occurrence id.
 * @param from - Document start position.
 * @returns Immutable input and its source-read observer.
 */
function createObservedLeaf(id: string, from: number) {
  const readBaseline = vi.fn(() => 18);
  const fragments: readonly QuireTextFragment[] = [{
    id: `${id}:text`, text: "word", range: { from: from + 1, to: from + 5 },
    rect: { x: 0, y: 0, width: 40, height: 24 }, font: "16px sans-serif",
    lineHeight: 24, get baseline() { return readBaseline(); }, caretStops: []
  }];
  const readFragments = vi.fn(() => fragments);
  const input: QuireBlockLayoutInput = {
    id, range: { from, to: from + 6 },
    get textFragments() { return readFragments(); }
  };
  return { input, readFragments, readBaseline };
}

/**
 * Wraps paragraph inputs in a fresh ordinary section occurrence.
 *
 * @param children - Source-order paragraph inputs.
 * @returns A new section input, forcing its root retained record to rebuild.
 */
function section(children: readonly QuireBlockLayoutInput[]): QuireBlockLayoutInput {
  return { id: "section", range: { from: 0, to: 100 }, children };
}

const geometry = {
  id: "doc", range: { from: 0, to: 100 },
  rect: { x: 10, y: 20, width: 300, height: 0 }, blockHeight: 24, blockGap: 0
};

describe("retained recursive leaf flow", () => {
  it("copies fragments once when a section stays at its built origin", () => {
    const range = { from: 0, to: 6002 };
    const leaves = Array.from({ length: 1000 }, (_, index) => createObservedLeaf(`paragraph-${index}`, index * 6 + 1));
    const children = [{ ...section(leaves.map(leaf => leaf.input)), range }];
    const expected = layoutQuireBlockDocument({ ...geometry, range, children });
    for (const leaf of leaves) {
      leaf.readFragments.mockClear();
      leaf.readBaseline.mockClear();
    }
    const actual = layoutQuireBlockDocument({
      ...geometry, range, children, retainedBlockGraph: createQuireRetainedBlockLayoutGraph()
    });
    expect(actual).toEqual(expected);
    // Only absolute placement copies a source fragment. Local normalization is
    // deferred, and the identical indexed origin reuses the absolute result.
    for (const leaf of leaves) {
      expect(leaf.readFragments).toHaveBeenCalledTimes(1);
      expect(leaf.readBaseline).toHaveBeenCalledTimes(1);
    }
  });

  it("skips unchanged child placement while its section root rebuilds", () => {
    const graph = createQuireRetainedBlockLayoutGraph();
    const first = createObservedLeaf("first", 1);
    const middle = createObservedLeaf("middle", 7);
    const last = createObservedLeaf("last", 13);
    layoutQuireBlockDocument({
      ...geometry, retainedBlockGraph: graph,
      children: [section([first.input, middle.input, last.input])]
    });
    expect(first.readBaseline).toHaveBeenCalled();
    first.readBaseline.mockClear();
    const changed = createObservedLeaf("middle", 7);
    const shifted = createObservedLeaf("last", 14);
    const children = [section([first.input, changed.input, shifted.input])];
    const next = layoutQuireBlockDocument({
      ...geometry, retainedBlockGraph: graph, children
    });

    expect(first.readBaseline).not.toHaveBeenCalled();
    expect(changed.readBaseline).toHaveBeenCalled();
    expect(shifted.readBaseline).toHaveBeenCalled();
    expect(graph.snapshot().rebuiltRecords).toBe(2);
    expect(next).toEqual(layoutQuireBlockDocument({ ...geometry, children }));
  });
  it("isolates accepted and transient graph placements", () => {
    const accepted = createQuireRetainedBlockLayoutGraph();
    const transient = createQuireRetainedBlockLayoutGraph();
    const leaf = createObservedLeaf("first", 1);
    for (const graph of [accepted, accepted, transient]) {
      leaf.readBaseline.mockClear();
      layoutQuireBlockDocument({
        ...geometry, retainedBlockGraph: graph, children: [section([leaf.input])]
      });
      if (graph === accepted && accepted.snapshot().commits === 2) {
        expect(leaf.readBaseline).not.toHaveBeenCalled();
      } else {
        expect(leaf.readBaseline).toHaveBeenCalled();
      }
    }
    expect(accepted.leafFlowCache.snapshot().hits).toBe(1);
    expect(transient.leafFlowCache.snapshot().hits).toBe(0);
  });

  it("does not publish a failed leaf and leaves prior returned boxes unchanged", () => {
    const graph = createQuireRetainedBlockLayoutGraph();
    const first = createObservedLeaf("first", 1);
    const initial = layoutQuireBlockDocument({
      ...geometry, retainedBlockGraph: graph, children: [section([first.input])]
    });
    const original = JSON.stringify(initial);
    const failed = createObservedLeaf("second", 7);
    failed.readBaseline.mockImplementationOnce(() => { throw new Error("placement failure"); });
    const children = [section([first.input, failed.input])];
    const build = () => layoutQuireBlockDocument({
      ...geometry, retainedBlockGraph: graph, children
    });
    expect(build).toThrow("placement failure");
    expect(graph.snapshot().commits).toBe(1);
    expect(graph.leafFlowCache.snapshot().stores).toBe(1);
    expect(JSON.stringify(initial)).toBe(original);
    first.readBaseline.mockClear();
    failed.readBaseline.mockClear();
    const retried = build();
    expect(first.readBaseline).not.toHaveBeenCalled();
    expect(failed.readBaseline).toHaveBeenCalled();
    expect(retried).toEqual(layoutQuireBlockDocument({ ...geometry, children }));
    expect(JSON.stringify(initial)).toBe(original);
  });

  it("keeps provider execution fresh while reusing exact ordinary child placements", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false, trailingNode: false })],
      content: { type: "doc", content: [{ type: "blockquote", content: [
        { type: "paragraph", content: [{ type: "text", text: "First" }] },
        { type: "paragraph", content: [{ type: "text", text: "Second" }] }
      ] }] }
    });
    const graph = createQuireRetainedBlockLayoutGraph();
    const options = {
      state: editor.state, editor, viewportRect: geometry.rect,
      blockShapeCache: createQuireBlockShapeCache(),
      textMeasurer: { measureText: (text: string) => ({ width: text.length * 10 }) }
    };
    const first = buildQuireLayoutSnapshot(options, graph);
    const second = buildQuireLayoutSnapshot(options, graph);
    expect(graph.snapshot().providerExecution.openedExecutions).toBe(2);
    expect(graph.leafFlowCache.snapshot().hits).toBe(2);
    expect(second.root.children?.[0]?.viewRoot?.id)
      .toEqual(first.root.children?.[0]?.viewRoot?.id);
    expect(second.root.children?.[0]?.regionProducts)
      .not.toBe(first.root.children?.[0]?.regionProducts);
    expect(second.root.children?.[0]?.children?.map((child) =>
      child.textFragments?.[0]?.text)).toEqual(["First", "Second"]);
    editor.destroy();
  });

});
