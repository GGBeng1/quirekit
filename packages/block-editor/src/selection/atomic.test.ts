import { expect, it } from "vitest";
import { createBlockEditor } from "../runtime/create";

it("registers every product atom with shared structured selection", () => {
  const instance = createBlockEditor();
  try {
    const { editor } = instance;
    const atoms = Object.values(editor.schema.nodes).filter(type => type.isBlock && type.isAtom);
    expect(atoms.map(type => type.name)).toEqual(expect.arrayContaining(["image", "horizontalRule", "textDiagram", "flowchart", "mindMap", "whiteboard", "dataView"]));
    for (const type of atoms) {
      const registered = editor.extensionManager.selectionAdapterRegistry?.getByNodeType(type.name);
      expect(registered, type.name).toBeDefined();
      expect(registered?.adapter).toMatchObject({ modes: { fullyCrossed: "owner" } });
    }
  } finally { instance.destroy(); }
});
