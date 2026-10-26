import { EditorState, Schema } from "@quirekit/pm";
import { expect, it } from "vitest";
import { composeHtmlScheduledTransactions } from "./transactions";

const schema = new Schema({ nodes: {
  doc: { content: "block+", marks: "_", attrs: { label: { default: "" } } },
  paragraph: { group: "block", content: "text*" },
  card: { group: "block", atom: true, attrs: { title: { default: "before" } } },
  text: {}
}, marks: { strong: {} } });

/** @returns Text followed by an opaque attribute-owned block and a trailing paragraph. */
function fixture(): EditorState {
  return EditorState.create({ doc: schema.node("doc", null, [
    schema.node("paragraph", null, schema.text("abc")), schema.node("card"), schema.node("paragraph")
  ]) });
}

it("keeps an opaque attribute change dirty while surrounding text shifts its position", () => {
  const state = fixture();
  const first = state.tr.insertText("XY", 2).setNodeAttribute(7, "title", "after");
  const second = state.apply(first).tr.delete(1, 2);
  const composed = composeHtmlScheduledTransactions([first, second]);
  expect(composed.changedRanges).toContainEqual({ oldRange: { from: 5, to: 6 }, newRange: { from: 6, to: 7 } });
  expect(composed.documentNode.nodeAt(6)?.attrs.title).toBe("after");
});

it("retains a deleted attribute target's old range and maps its final boundary", () => {
  const state = fixture();
  const first = state.tr.setNodeAttribute(5, "title", "after");
  const second = state.apply(first).tr.delete(5, 6);
  expect(composeHtmlScheduledTransactions([first, second]).changedRanges)
    .toContainEqual({ oldRange: { from: 5, to: 6 }, newRange: { from: 5, to: 5 } });
});

it("includes node marks and document attributes without dirtying pure selection updates", () => {
  const state = fixture();
  const marked = state.tr.addNodeMark(5, schema.mark("strong"));
  expect(composeHtmlScheduledTransactions([marked]).changedRanges)
    .toContainEqual({ oldRange: { from: 5, to: 6 }, newRange: { from: 5, to: 6 } });
  const document = state.tr.setDocAttribute("label", "changed");
  expect(composeHtmlScheduledTransactions([document]).changedRanges)
    .toContainEqual({ oldRange: { from: 0, to: 8 }, newRange: { from: 0, to: 8 } });
  expect(composeHtmlScheduledTransactions([state.tr]).changedRanges).toEqual([]);
});
