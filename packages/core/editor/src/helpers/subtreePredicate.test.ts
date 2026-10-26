import { Schema, Transform, type Node as PMNode } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { createQuireSubtreePredicate, visitQuireMatchingDescendants } from "./subtreePredicate";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    section: { content: "block+", group: "block" },
    paragraph: { content: "inline*", group: "block" },
    text: { group: "inline" },
    marker: { group: "inline", inline: true, atom: true, attrs: { id: { default: "" } } }
  }
});

/** @param count - Paragraph count. @returns Document with one marker in the middle of a section. */
function document(count: number): PMNode {
  const paragraphs = Array.from({ length: count }, (_, index) => schema.node("paragraph", null, index === count >> 1
    ? [schema.text("before"), schema.node("marker", { id: "m" }), schema.text("after")]
    : [schema.text(`paragraph ${index}`)]));
  return schema.node("doc", null, [schema.node("paragraph", null, [schema.text("lead")]), schema.node("section", null, paragraphs)]);
}

/** @param doc - Source. @param contains - Pruning predicate. @returns Visited nodes and positions. */
function visit(doc: PMNode, contains: (node: PMNode) => boolean): { visits: number; found: [string, number, string][] } {
  let visits = 0;
  const found: [string, number, string][] = [];
  visitQuireMatchingDescendants(doc, contains, (node, position, parent) => {
    visits += 1;
    if (node.type.name === "marker") found.push([node.attrs.id as string, position, parent?.type.name ?? ""]);
  });
  return { visits, found };
}

describe("subtree predicate traversal", () => {
  it("visits the same matches as descendants while skipping unrelated subtrees", () => {
    const doc = document(1000);
    const contains = createQuireSubtreePredicate((node) => node.type.name === "marker");
    const expected: [string, number, string][] = [];
    doc.descendants((node, position, parent) => {
      if (node.type.name === "marker") expected.push([node.attrs.id as string, position, parent?.type.name ?? ""]);
    });
    const result = visit(doc, contains);
    expect(result.found).toEqual(expected);
    // The section, the marked paragraph and the marker itself.
    expect(result.visits).toBe(3);
  });

  it("evaluates only changed nodes after an edit", () => {
    const seen: PMNode[] = [];
    const contains = createQuireSubtreePredicate((node) => { seen.push(node); return node.type.name === "marker"; });
    const doc = document(1000);
    visit(doc, contains);
    seen.length = 0;
    const edited = new Transform(doc).insert(3, schema.text("x")).doc;
    const result = visit(edited, contains);
    expect(result.found).toEqual([["m", expect.any(Number), "paragraph"]]);
    // Only the edited paragraph and text nodes on visited paths are evaluated;
    // the section and its 1000 paragraphs are shared with the previous version.
    expect(seen.length).toBeLessThan(10);
  });

  it("stops at a subtree whose visit returns false", () => {
    const doc = document(10);
    const contains = createQuireSubtreePredicate((node) => node.type.name === "marker");
    let visits = 0;
    visitQuireMatchingDescendants(doc, contains, (node) => { visits += 1; return node.type.name !== "section"; });
    expect(visits).toBe(1);
  });
});
