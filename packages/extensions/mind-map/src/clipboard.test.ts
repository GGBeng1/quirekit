import { describe, expect, it } from "vitest";
import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { Fragment, Slice } from "@quirekit/pm";
import { createMindMapEmbed, createMindMapDocument } from "@quirekit/mind-map";
import { MindMap } from "./extension";
import { forkMindMapSlice } from "./clipboard";

describe("source-preserving object copies", () => {
  it("gives every pasted host object a new identity while retaining mind map-local data and marks", () => {
    const editor = createEditor({ extensions: [StarterKit, MindMap] });
    try {
      const base = createMindMapEmbed("original"), mind = { ...base, document: { ...base.document,
        root: createMindMapDocument({ text: "继续编辑", children: [] }).root } };
      const node = editor.state.pm.schema.nodes.mindMap!.create({ mind });
      const slice = new Slice(Fragment.fromArray([node, node]), 0, 0), pasted = forkMindMapSlice(slice);
      expect(pasted.content.child(0).attrs.mind.id).not.toBe(mind.id);
      expect(pasted.content.child(0).attrs.mind.id).not.toBe(pasted.content.child(1).attrs.mind.id);
      expect(pasted.content.child(0).attrs.mind.document).toEqual(mind.document);
      expect(slice.content.child(0).attrs.mind).toBe(mind);
      expect(editor.can().undo()).toBe(false);
    } finally { editor.destroy(); }
  });
});
