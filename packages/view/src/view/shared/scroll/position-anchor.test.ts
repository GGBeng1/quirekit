import { Schema } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { mapAnchorPosition } from "./position-anchor";

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*", attrs: { id: { default: null } } },
    text: {}
  }
});

/**
 * @param texts - Paragraph texts.
 * @returns Document of those paragraphs.
 */
function doc(...texts: string[]) {
  return schema.node("doc", null, texts.map(text => schema.node("paragraph", null, text === "" ? [] : [schema.text(text)])));
}

describe("scroll anchor position mapping", () => {
  const before = doc("one", "two", "three");
  // Positions: "one" 1–4, "two" 6–9, "three" 11–16.

  it("keeps positions before the change and shifts those after it", () => {
    const after = before.copy(before.content.addToStart(schema.node("paragraph", null, [schema.text("new")])));
    expect(mapAnchorPosition(before, after, 7)).toBe(12);
    const tail = before.copy(before.content.addToEnd(schema.node("paragraph", null, [schema.text("end")])));
    expect(mapAnchorPosition(before, tail, 7)).toBe(7);
  });

  it("returns the position unchanged for the same or an equal document", () => {
    expect(mapAnchorPosition(before, before, 7)).toBe(7);
    expect(mapAnchorPosition(before, doc("one", "two", "three"), 7)).toBe(7);
  });

  it("loses the anchor inside the changed span", () => {
    expect(mapAnchorPosition(before, doc("one", "TWO", "three"), 7)).toBeNull();
    expect(mapAnchorPosition(before, doc("one", "TWO", "three"), 12)).toBe(12);
  });

  it("ignores attribute-only differences such as regenerated block ids", () => {
    const withIds = (id: string) => before.copy(before.content.addToStart(schema.node("paragraph", { id }, [schema.text("new")])));
    expect(mapAnchorPosition(withIds("a"), withIds("b"), 12)).toBe(12);
    const grown = withIds("c").copy(withIds("c").content.addToStart(schema.node("paragraph", { id: "d" }, [schema.text("more")])));
    expect(mapAnchorPosition(withIds("a"), grown, 12)).toBe(18);
  });

  it("follows the anchor through changes above and below it in one step", () => {
    const after = doc("new", "one", "two", "three", "end");
    expect(mapAnchorPosition(before, after, 7)).toBe(12);
    // Repeated paragraphs keep their rank among equals.
    expect(mapAnchorPosition(doc("x", "a", "a", "y"), doc("X", "a", "b", "a", "Y"), 7)).toBe(10);
  });

  it("maps across repeated content where the two scans overlap", () => {
    const repeated = doc("a", "a");
    const grown = doc("a", "a", "a");
    // The added paragraph can be matched at either end; positions after the first stay valid.
    expect(mapAnchorPosition(repeated, grown, 1)).toBe(1);
    expect(mapAnchorPosition(repeated, grown, 4)).toBe(4);
  });
});
