import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { parser } from "@quirekit/lezer-markdown";
import { sourceDocument, sourceNode } from "@quirekit/msfe-core";
import { mathSyntax } from "../math/syntax";
import { delimitedBody } from "./source";

/** @param source - Exact Markdown. @returns Bodies accepted by the shared source codec. */
function bodies(source: string): (string | null)[] {
  const document = sourceDocument(EditorState.create({ doc: source }));
  const result: (string | null)[] = [];
  parser.configure(mathSyntax).parse(source).iterate({ enter(node) {
    if (node.name === "DisplayMath") result.push(delimitedBody(document, sourceNode(node.node), "DisplayMathMark"));
  } });
  return result;
}

describe("container-owned formula bodies", () => {
  it("removes quote and list prefixes while retaining math indentation and blank lines", () => {
    expect(bodies("> $$\n>   x + y\n>\n> z\n> $$")).toEqual(["  x + y\n\nz"]);
    expect(bodies("> > $$\n> > E = mc^2\n> > $$")).toEqual(["E = mc^2"]);
    expect(bodies("- $$\n  x + y\n  $$")).toEqual(["x + y"]);
  });
  it("preserves ordinary bodies and incomplete source", () => {
    expect(bodies("$$\n  x + y\n\nz\n$$")).toEqual(["  x + y\n\nz"]);
    expect(bodies("> $$\n> x")).toEqual([null]);
  });
  it("does not close an unfinished formula with a delimiter outside its container", () => {
    expect(bodies("> $$\n> x\n\n$$\ny\n$$")).toEqual([null, "y"]);
    expect(bodies("- $$\n  x\n\n$$\ny\n$$")).toEqual([null, "y"]);
  });
});
