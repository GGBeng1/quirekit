import { describe, expect, it } from "vitest";
import { createDocumentState } from "../mount/state";
import { sourceBlockAt, sourceBlockSibling } from "./query";
import { insertSourceBlock, moveSourceBlock, removeSourceBlock } from "./commands";
import { buildCommandTransaction } from "../commands/transaction";

describe("source block transactions", () => {
  const doc = "# Title\n\nfirst **paragraph**\ncontinuation\n\n- one\n  - nested\n- two\n\n```ts\nconst x = 1\n```\n\nlast";
  it("resolves whole semantic blocks instead of inline nodes or list descendants", () => {
    const state = createDocumentState(doc, []);
    expect(sourceBlockAt(state, doc.indexOf("paragraph"))).toMatchObject({ name: "Paragraph", from: 9, to: doc.indexOf("\n\n- one") });
    const list = sourceBlockAt(state, doc.indexOf("nested"))!;
    expect(list.name).toBe("BulletList");
    expect(sourceBlockSibling(state, list, 1)?.name).toBe("FencedCode");
    expect(sourceBlockAt(state, doc.indexOf("\n\n") + 1)).toBeNull();
  });
  for (const direction of ["before", "after"] as const) it(`moves exact multiline content ${direction} a sibling`, () => {
    const state = createDocumentState(doc, []), list = sourceBlockAt(state, doc.indexOf("nested"))!;
    const target = sourceBlockAt(state, direction === "before" ? 1 : doc.length)!;
    const transaction = buildCommandTransaction(state, [moveSourceBlock(list, target, direction)])!;
    const payload = "- one\n  - nested\n- two";
    const remainder = doc.replace(payload + "\n\n", "");
    expect(transaction.state.doc.toString()).toBe(direction === "before" ? payload + "\n\n" + remainder : remainder + "\n\n" + payload);
    expect(transaction.changes.invert(state.doc).apply(transaction.state.doc).toString()).toBe(doc);
  });
  it("rejects self, no-op and obsolete ranges without changing selection", () => {
    const state = createDocumentState(doc, []), first = sourceBlockAt(state, 1)!, second = sourceBlockSibling(state, first, 1)!;
    expect(moveSourceBlock(first, first, "after")(state)).toBeNull();
    expect(moveSourceBlock(first, second, "before")(state)).toBeNull();
    const changed = state.update({ changes: { from: 0, insert: "new " } }).state;
    expect(removeSourceBlock(first)(changed)).toBeNull();
  });
  it("duplicates and removes end blocks without merging surrounding Markdown", () => {
    const state = createDocumentState("alpha\n\nbeta", []), end = sourceBlockAt(state, 8)!;
    const insert = insertSourceBlock(end, "after", "beta")(state)!;
    expect(state.update(insert).state.doc.toString()).toBe("alpha\n\nbeta\n\nbeta");
    expect(state.update(removeSourceBlock(end)(state)!).state.doc.toString()).toBe("alpha");
    const single = createDocumentState("only", []);
    expect(single.update(removeSourceBlock(sourceBlockAt(single, 1)!)(single)!).state.doc.length).toBe(0);
  });
  it("retains optional leading indentation and trailing spaces as block source", () => {
    const doc = "  ## Heading  \n\nfirst\n\nlast", state = createDocumentState(doc, []);
    const heading = sourceBlockAt(state, doc.indexOf("Heading"))!, first = sourceBlockSibling(state, heading, 1)!;
    expect(sourceBlockAt(state, 0)).toEqual(heading);
    expect(first.name).toBe("Paragraph");
    const moved = moveSourceBlock(heading, sourceBlockAt(state, doc.length)!, "after")(state)!;
    expect(state.update(moved).state.doc.toString()).toBe("first\n\nlast\n\n  ## Heading  ");
  });
});
