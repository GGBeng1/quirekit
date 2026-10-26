import { describe, expect, it } from "vitest";
import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { Fragment, Slice } from "@quirekit/pm";
import { createTextDiagram } from "@quirekit/text-diagram";
import { TextDiagram } from "./extension";
import { forkTextDiagramSlice } from "./clipboard";

describe("source-preserving object copies", () => {
  it("gives every pasted host object a new identity while retaining exact source and marks", () => {
    const editor = createEditor({ extensions: [StarterKit, TextDiagram] });
    try {
      const diagram = createTextDiagram("original", "plantuml", "@startuml\n甲 -> 乙\n@enduml");
      const node = editor.state.pm.schema.nodes.textDiagram!.create({ diagram });
      const slice = new Slice(Fragment.fromArray([node, node]), 0, 0), pasted = forkTextDiagramSlice(slice);
      expect(pasted.content.child(0).attrs.diagram.id).not.toBe(diagram.id);
      expect(pasted.content.child(0).attrs.diagram.id).not.toBe(pasted.content.child(1).attrs.diagram.id);
      expect(pasted.content.child(0).attrs.diagram.document).toEqual(diagram.document);
      expect(slice.content.child(0).attrs.diagram).toBe(diagram);
      expect(editor.can().undo()).toBe(false);
    } finally { editor.destroy(); }
  });
});
