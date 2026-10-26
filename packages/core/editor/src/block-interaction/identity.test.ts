import { describe, expect, it } from "vitest";
import { withoutBlockInteractionIdentity } from "./identity";

describe("block identity comparison projection", () => {
  it("only omits node identity, preserving content, marks, owner ids and opaque attributes", () => {
    const node = { type: "paragraph", attrs: { blockId: "a", id: "owner", custom: { type: "record", attrs: { blockId: "opaque" } } }, content: [{ type: "text", text: "A", marks: [{ type: "custom", attrs: { blockId: "mark" } }] }] };
    const projected = withoutBlockInteractionIdentity([node]);
    expect(projected).toEqual([{ ...node, attrs: { id: "owner", custom: node.attrs.custom } }]);
    expect(node.attrs.blockId).toBe("a");
    expect(withoutBlockInteractionIdentity([{ ...node, attrs: { ...node.attrs, blockId: "new" } }])).toEqual(projected);
    expect(withoutBlockInteractionIdentity([{ ...node, content: [{ type: "text", text: "changed" }] }])).not.toEqual(projected);
    expect(withoutBlockInteractionIdentity([{ ...node, attrs: { ...node.attrs, id: "different" } }])).not.toEqual(projected);
  });
});
