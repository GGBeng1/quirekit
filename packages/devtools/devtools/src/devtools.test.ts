import { createEditor, Node, type QuireJSONContent } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { createQuireDevtools } from "./devtools";

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

const baseExtensions = [Document, Paragraph, Text];

describe("createQuireDevtools", () => {
  it("records editor dispatch transactions through the extension", () => {
    let now = 0;
    const devtools = createQuireDevtools({
      clock: () => {
        const current = now;
        now += 5;
        return current;
      },
      slowThresholdMs: 4
    });
    const editor = createEditor({
      extensions: [...baseExtensions, devtools.extension()],
      content: paragraphDoc("hi")
    });

    editor.dispatchTransaction(
      editor.state.pm.tr.insertText("!", 3).setMeta("uiEvent", "input")
    );

    expect(editor.getText()).toBe("hi!");
    expect(devtools.getEntries()).toEqual([
      expect.objectContaining({
        kind: "operation",
        source: "input",
        stepCount: 1,
        docChanged: true,
        selectionSet: false,
        metaKeys: ["uiEvent"],
        startedAt: 0,
        measured: true,
        slow: true,
        phases: expect.arrayContaining([
          expect.objectContaining({ name: "pm-apply" }),
          expect.objectContaining({ name: "editor-events" }),
          expect.objectContaining({ name: "mounted-views" })
        ])
      })
    ]);
  });

  it("records editor operation phases through public editor events", () => {
    let now = 0;
    const devtools = createQuireDevtools({
      clock: () => {
        const current = now;
        now += 5;
        return current;
      }
    });
    const editor = createEditor({
      extensions: [...baseExtensions, devtools.extension()],
      content: paragraphDoc("hi")
    });

    editor.dispatchTransaction(editor.state.pm.tr.insertText("!", 3));

    const operation = devtools.getEntries().find((entry) => entry.kind === "operation");

    expect(operation).toEqual(
      expect.objectContaining({
        kind: "operation",
        phases: expect.arrayContaining([
          expect.objectContaining({ name: "pm-apply" }),
          expect.objectContaining({ name: "editor-events" }),
          expect.objectContaining({ name: "mounted-views" })
        ])
      })
    );
  });

  it("exposes the current editor snapshot", () => {
    const devtools = createQuireDevtools();
    const editor = createEditor({
      extensions: [...baseExtensions, devtools.extension()],
      content: paragraphDoc("hello")
    });
    const snapshot = devtools.getSnapshot({
      includeDebugJSON: true,
      includeJSON: true
    });

    expect(snapshot.attached).toBe(true);
    expect(snapshot.docSize).toBe(editor.state.doc.nodeSize);
    expect(snapshot.textLength).toBe(5);
    expect(snapshot.selection).toEqual({
      from: editor.state.pm.selection.from,
      to: editor.state.pm.selection.to,
      empty: true,
      anchor: editor.state.pm.selection.anchor,
      head: editor.state.pm.selection.head
    });
    expect(snapshot.schema).toEqual({
      topNode: "doc",
      nodes: ["doc", "paragraph", "text"],
      marks: []
    });
    expect(snapshot.extensionNames).toContain("devtools");
    expect(snapshot.pluginKeys.length).toBeGreaterThan(0);
    expect(snapshot.storageKeys).toContain("devtools");
    expect(snapshot.document).toEqual(paragraphDoc("hello"));
    expect(snapshot.debugDocument).toEqual(
      expect.objectContaining({ type: "doc", from: 0 })
    );
  });

  it("detaches when the editor is destroyed", () => {
    const devtools = createQuireDevtools();
    const editor = createEditor({
      extensions: [...baseExtensions, devtools.extension()],
      content: paragraphDoc("bye")
    });

    editor.destroy();

    expect(devtools.getSnapshot()).toEqual({
      attached: false,
      docSize: 0,
      textLength: 0,
      extensionNames: [],
      pluginKeys: [],
      storageKeys: []
    });
  });
});

/**
 * Creates a one-paragraph JSON document for devtools tests.
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
