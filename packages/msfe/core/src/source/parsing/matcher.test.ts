import { describe, expect, it } from "vitest";
import { NodeType, Tree, type TreeBuffer } from "@lezer/common";
import { parser } from "@quirekit/lezer-markdown";
import { createChunkMatcher } from "./matcher";

/** @param root - Immutable tree. @returns Independent exhaustive coordinate/identity oracle, without a retained search path. */
function locations(root: Tree): { from: number; chunk: Tree | TreeBuffer }[] {
  const result: { from: number; chunk: Tree | TreeBuffer }[] = [];
  /** @param chunk - Native tree/buffer. @param from - Absolute origin. */
  function visit(chunk: Tree | TreeBuffer, from: number): void {
    result.push({ chunk, from });
    if (chunk instanceof Tree) chunk.children.forEach((child, index) => visit(child, from + chunk.positions[index]!));
  }
  visit(root, 0); return result;
}

describe("old-tree reuse proofs", () => {
  it("matches exhaustive identity locations across balancing nodes, buffers and changed envelopes", () => {
    const root = parser.parse(Array.from({ length: 300 }, (_, index) =>
      `## Heading ${index}\n\n- **nested** [link](url)\n  - another\n\n> quoted *text*\n\n`).join(""));
    const known = locations(root), match = createChunkMatcher(root, { builds: 0, visitedChunks: 0, comparedChunks: 0, reuseChecks: 0, reuseMappings: 0 });
    expect(known.some(value => !(value.chunk instanceof Tree))).toBe(true);
    for (const { chunk, from } of known) {
      expect(match(from, chunk)).toBe(true);
      expect(match(from + 1, chunk)).toBe(known.some(value => value.chunk === chunk && value.from === from + 1));
    }
    // A changed envelope can first descend at the same origin as its retained
    // children. Failed candidates must not pin the cursor inside the wrong span.
    for (const { from, chunk } of [...known].reverse()) expect(match(from, chunk)).toBe(true);
  });

  it("does not lose equal-position zero-length siblings behind a cached positive path", () => {
    const emptyA = new Tree(NodeType.define({ id: 1, name: "A" }), [], [], 0);
    const emptyB = new Tree(NodeType.define({ id: 2, name: "B" }), [], [], 0);
    const leaf = new Tree(NodeType.define({ id: 3, name: "Leaf" }), [], [], 10);
    const group = new Tree(NodeType.none, [emptyA, leaf, emptyB], [0, 0, 10], 10);
    const root = new Tree(NodeType.none, [emptyB, group, emptyA], [0, 0, 10], 10);
    const match = createChunkMatcher(root, { builds: 0, visitedChunks: 0, comparedChunks: 0, reuseChecks: 0, reuseMappings: 0 });
    expect(match(0, leaf)).toBe(true);
    for (const item of locations(root)) expect(match(item.from, item.chunk)).toBe(true);
    expect(match(1, emptyA)).toBe(false);
  });
});
