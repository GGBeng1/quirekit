import { createEditor, Node, type QuireJSONContent } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { summarizeTransactionOperation } from "./operation";

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

describe("summarizeTransactionOperation", () => {
  it("captures step, metadata, document, and selection details", () => {
    const editor = createEditor({
      extensions: [Document, Paragraph, Text],
      content: paragraphDoc("hi")
    });
    const transaction = editor.state.pm.tr
      .insertText("!", 3)
      .setMeta("source", "typing");
    const summary = summarizeTransactionOperation(transaction, {
      trigger: {
        source: "beforeinput",
        label: "insertText",
        inputType: "insertText",
        target: "textarea"
      }
    });

    expect(summary).toEqual(
      expect.objectContaining({
        source: "typing",
        stepCount: 1,
        docChanged: true,
        selectionSet: false,
        metaKeys: ["source"],
        trigger: expect.objectContaining({
          source: "beforeinput",
          inputType: "insertText"
        }),
        details: expect.objectContaining({
          docBeforeSize: editor.state.doc.nodeSize,
          docAfterSize: editor.state.doc.nodeSize + 1,
          selectionType: "TextSelection",
          meta: [
            {
              key: "source",
              valueType: "string",
              preview: "\"typing\""
            }
          ],
          steps: [
            expect.objectContaining({
              index: 0,
              type: "replace",
              from: 3,
              to: 3,
              deletedSize: 0,
              insertedSize: 1,
              textPreview: "!",
              nodeTypes: ["text"]
            })
          ]
        })
      })
    );
  });
});

/**
 * Creates a one-paragraph JSON document for operation tests.
 *
 * @param text - Paragraph text content.
 * @returns JSON document containing one paragraph.
 */
function paragraphDoc(text: string): QuireJSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }]
      }
    ]
  };
}
