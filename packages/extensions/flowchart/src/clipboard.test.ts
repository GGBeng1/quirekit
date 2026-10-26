import { describe, expect, it } from "vitest";
import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { Fragment, Slice } from "@quirekit/pm";
import { createFlowchartEmbed, createFlowchartNode } from "@quirekit/flowchart";
import { Flowchart } from "./extension";
import { forkFlowchartSlice } from "./clipboard";

describe("source-preserving object copies", () => {
  it("gives every pasted host object a new identity while retaining graph-local data and marks", () => {
    const editor = createEditor({ extensions: [StarterKit, Flowchart] });
    try {
      const base = createFlowchartEmbed("original"), flow = { ...base, document: { ...base.document,
        nodes: [createFlowchartNode("node", "process", { x: 24, y: 48 }, "继续编辑")] } };
      const node = editor.state.pm.schema.nodes.flowchart!.create({ flow });
      const slice = new Slice(Fragment.fromArray([node, node]), 0, 0), pasted = forkFlowchartSlice(slice);
      expect(pasted.content.child(0).attrs.flow.id).not.toBe(flow.id);
      expect(pasted.content.child(0).attrs.flow.id).not.toBe(pasted.content.child(1).attrs.flow.id);
      expect(pasted.content.child(0).attrs.flow.document).toEqual(flow.document);
      expect(slice.content.child(0).attrs.flow).toBe(flow);
      expect(editor.can().undo()).toBe(false);
    } finally { editor.destroy(); }
  });
});
