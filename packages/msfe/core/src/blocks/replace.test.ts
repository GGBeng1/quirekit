import { expect, it } from "vitest";
import { createDocumentState } from "../mount/state";
import { sourceBlockAt } from "./query";
import { replaceSourceBlock } from "./commands";

it.each([
  ["/h2", "## Title"],
  ["before\n\n/h2\n\nafter", "before\n\n## Title\n\nafter"],
  ["# Previous\n/h2\n# Next", "# Previous\n\n## Title\n\n# Next"],
] as const)("atomically replaces a complete block with stable separators: %s", (source, expected) => {
  const state = createDocumentState(source, []), block = sourceBlockAt(state, source.indexOf("/h2"))!;
  const spec = replaceSourceBlock(block, "## Title")(state)!;
  const tr = state.update(spec);
  expect(tr.state.doc.toString()).toBe(expected);
  expect(tr.state.selection.main.head).toBe(expected.indexOf("## Title") + 8);
  expect(tr.changes.invert(state.doc).apply(tr.state.doc).toString()).toBe(source);
  expect(replaceSourceBlock(block, " ")(state)).toBeNull();
  expect(replaceSourceBlock(block, "## Title")(state.update({ changes: { from: block.from, insert: "new" } }).state)).toBeNull();
});
