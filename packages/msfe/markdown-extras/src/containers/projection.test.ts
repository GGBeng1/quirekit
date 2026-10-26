import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { ensureSyntaxTree } from "@quirekit/cm-language";
import type { ProjectionContext } from "@quirekit/msfe-core";
import { containerSyntax } from "./syntax";
import { projectContainer } from "./projection";

const source = "lead\n\n::: note 标题\nbody\n:::\n\ntail";

/** @param active - Whether the caret reveals the container's source. @returns Line classes keyed by line number. */
function lineClasses(active: boolean): Map<number, string> {
  const state = EditorState.create({ doc: source, extensions: [markdown({ extensions: containerSyntax(["note"]) })] });
  const tree = ensureSyntaxTree(state, state.doc.length, 5000)!;
  let node = tree.topNode.firstChild;
  while (node && node.name !== "CustomContainer") node = node.nextSibling;
  const context = { state, node: node!, active, from: 0, to: state.doc.length } as unknown as ProjectionContext;
  const classes = new Map<number, string>();
  for (const range of projectContainer(context)) {
    const spec = range.value.spec as { class?: string };
    if (spec.class) classes.set(state.doc.lineAt(range.from).number, spec.class);
  }
  return classes;
}

describe("container closing fence", () => {
  it("collapses only while the container is projected", () => {
    expect(lineClasses(false).get(5)).toContain("msfe-container-end-hidden");
    expect(lineClasses(true).get(5)).not.toContain("msfe-container-end-hidden");
    expect(lineClasses(false).get(4)).not.toContain("msfe-container-end-hidden");
  });
});
