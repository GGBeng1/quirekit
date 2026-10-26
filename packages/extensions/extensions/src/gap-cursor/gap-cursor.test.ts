import { createEditor, Node } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { Gapcursor } from "./gap-cursor";

const Document = Node.create({
  name: "doc",
  topNode: true,
  content: "block+"
});

const Paragraph = Node.create({
  name: "paragraph",
  group: "block",
  content: "inline*"
});

const Text = Node.create({
  name: "text",
  group: "inline"
});

const Figure = Node.create({
  name: "figure",
  group: "block",
  atom: true,
  allowGapCursor: true
});

describe("Gapcursor", () => {
  it("installs the gap cursor plugin and node schema field", () => {
    const editor = createEditor({
      extensions: [Document, Paragraph, Text, Figure, Gapcursor],
      content: {
        type: "doc",
        content: [{ type: "figure" }]
      }
    });

    expect(Gapcursor.name).toBe("gapCursor");
    expect(editor.schema.nodes.figure!.spec.allowGapCursor).toBe(true);
    expect(
      editor.state.pm.plugins.some((plugin) =>
        typeof plugin.props.handleKeyDown === "function" &&
        typeof plugin.props.createSelectionBetween === "function"
      )
    ).toBe(true);
  });
});
