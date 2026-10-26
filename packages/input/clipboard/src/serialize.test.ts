import { createEditor, Extension } from "@quirekit/core";
import type {
  QuireClipboardResource,
  QuireEditorProps
} from "@quirekit/core";
import {
  NodeSelection,
  Plugin,
  TextSelection,
  type Node as PMNode,
  type ResolvedPos,
  type Slice
} from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import {
  canvasInternalClipboardMime,
  extractQuireEmbeddedClipboardPayload,
  parseQuireInternalClipboardPayload,
  stripQuireEmbeddedClipboardPayload,
  pasteQuireClipboardSlice,
  readQuireClipboardSlice,
  serializeQuireClipboardSlice,
  writeQuireClipboardSelection
} from "./index";
import type { QuireClipboardData } from "./types";

describe("canvas clipboard serialization", () => {
  it("writes internal, HTML, and plain text formats for the current selection", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }]
      }
    });
    const clipboard = createClipboardData();

    editor.dispatchTransaction(
      editor.state.pm.tr.setSelection(TextSelection.create(editor.state.doc, 1, 6))
    );

    expect(writeQuireClipboardSelection({ editor, clipboardData: clipboard })).toBe(true);
    expect(clipboard.getData("text/plain")).toBe("Hello");
    expect(clipboard.getData("text/html")).toContain("Hello");
    expect(JSON.parse(clipboard.getData(canvasInternalClipboardMime))).toMatchObject({
      type: "quirekit/slice",
      version: 1,
      schema: "quirekit"
    });
  });

  it("writes an atom selection that has no plain text (a horizontal rule)", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [
          { type: "horizontalRule" },
          { type: "paragraph", content: [{ type: "text", text: "x" }] }
        ]
      }
    });
    const clipboard = createClipboardData();

    editor.dispatchTransaction(
      editor.state.pm.tr.setSelection(NodeSelection.create(editor.state.doc, 0))
    );

    expect(writeQuireClipboardSelection({ editor, clipboardData: clipboard })).toBe(true);
    expect(clipboard.getData(canvasInternalClipboardMime).length).toBeGreaterThan(0);
    expect(clipboard.getData("text/html")).toContain("<hr");
    expect(clipboard.getData("text/plain")).toBe("");
  });

  it("uses structural selection clipboard formats when available", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }]
      }
    });
    const clipboard = createClipboardData();
    const $anchor = editor.state.doc.resolve(1);
    const $head = editor.state.doc.resolve(6);

    editor.dispatchTransaction(
      editor.state.pm.tr.setSelection(new StructuralClipboardSelection($anchor, $head))
    );

    expect(writeQuireClipboardSelection({ editor, clipboardData: clipboard })).toBe(true);
    expect(clipboard.getData("text/plain")).toBe("A\tB");
    const html = clipboard.getData("text/html");
    expect(stripQuireEmbeddedClipboardPayload(html)).toBe("<table><tbody><tr><td>A</td><td>B</td></tr></tbody></table>");
    expect(extractQuireEmbeddedClipboardPayload(html)).toBe(clipboard.getData(canvasInternalClipboardMime));
    expect(JSON.parse(clipboard.getData(canvasInternalClipboardMime))).toMatchObject({
      type: "quirekit/slice",
      version: 1,
      schema: "quirekit"
    });
  });

  it("prefers the private QuireKit slice format when reading clipboard data", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }]
      }
    });
    const serialized = serializeQuireClipboardSlice({
      editor,
      slice: editor.state.doc.slice(1, 6)
    });
    const clipboard = createClipboardData({
      [canvasInternalClipboardMime]: serialized.internal,
      "text/html": "<p>Ignored</p>",
      "text/plain": "Ignored"
    });
    const slice = readQuireClipboardSlice({ editor, clipboardData: clipboard });

    expect(slice?.content.textBetween(0, slice.content.size, "\n")).toBe("Hello");
  });

  it("restores the exact slice and resources from HTML alone", () => {
    const resource: QuireClipboardResource = { namespace: "example/resource", version: 1, key: "entry-1", data: { label: "portable" } };
    const editor = createEditor({
      extensions: [StarterKit],
      editorProps: { quireClipboardResources: () => [resource] },
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Hello", marks: [{ type: "bold" }] }] }]
      }
    });
    const serialized = serializeQuireClipboardSlice({ editor, slice: editor.state.doc.slice(1, 6) });
    // The async Clipboard API exposes only text/html and text/plain to a menu paste.
    const clipboard = createClipboardData({ "text/html": serialized.html, "text/plain": serialized.plainText });
    const slice = readQuireClipboardSlice({ editor, clipboardData: clipboard });

    expect(slice?.toJSON()).toEqual(serialized.slice.toJSON());
    expect(parseQuireInternalClipboardPayload(extractQuireEmbeddedClipboardPayload(serialized.html) ?? "", editor)?.resources)
      .toEqual([resource]);
  });

  it("carries validated extension-owned resources beside the private slice", () => {
    const resource: QuireClipboardResource = {
      namespace: "example/resource",
      version: 1,
      key: "entry-1",
      data: { label: "portable" }
    };
    const editor = createEditor({
      extensions: [StarterKit],
      editorProps: {
        quireClipboardResources: () => [
          resource,
          { namespace: "example/resource", version: 1, key: "invalid", data: undefined }
        ]
      },
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }]
      }
    });
    const serialized = serializeQuireClipboardSlice({
      editor,
      slice: editor.state.doc.slice(1, 6)
    });
    const transfer = parseQuireInternalClipboardPayload(serialized.internal, editor);

    expect(serialized.resources).toEqual([resource]);
    expect(transfer?.resources).toEqual([resource]);
    expect(transfer?.slice.content.textBetween(0, transfer.slice.content.size))
      .toBe("Hello");
  });

  it("omits the optional resource field for ordinary clipboard content", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Plain" }] }]
      }
    });
    const serialized = serializeQuireClipboardSlice({
      editor,
      slice: editor.state.doc.slice(1, 6)
    });
    const payload = JSON.parse(serialized.internal) as Record<string, unknown>;

    expect(serialized.resources).toEqual([]);
    expect(Object.hasOwn(payload, "resources")).toBe(false);
  });

  it("composes every resource owner into one atomic paste transaction", () => {
    const resources: readonly QuireClipboardResource[] = [{
      namespace: "example/first",
      version: 1,
      key: "first",
      data: { value: 1 }
    }, {
      namespace: "example/second",
      version: 1,
      key: "second",
      data: { value: 2 }
    }];
    const source = createEditor({
      extensions: [StarterKit],
      editorProps: { quireClipboardResources: () => resources },
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Copy" }] }]
      }
    });
    const serialized = serializeQuireClipboardSlice({
      editor: source,
      slice: source.state.doc.slice(1, 5)
    });
    const applied: string[] = [];
    const pluginProps: QuireEditorProps = {
      quireClipboardResourcePaste: ({ slice, resources: incoming }) =>
        incoming.some(({ namespace }) => namespace === "example/second")
          ? { slice, apply: () => applied.push("plugin") }
          : null
    };
    const resourcePlugin = Extension.create({
      name: "testClipboardResourceOwner",
      addProseMirrorPlugins() {
        return [new Plugin({ props: pluginProps })];
      }
    });
    const target = createEditor({
      extensions: [StarterKit, resourcePlugin],
      editorProps: {
        quireClipboardResourcePaste: ({ slice, resources: incoming }) =>
          incoming.some(({ namespace }) => namespace === "example/first")
            ? { slice, apply: () => applied.push("direct") }
            : null
      },
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Target" }] }]
      }
    });
    target.dispatchTransaction(target.state.pm.tr.setSelection(
      TextSelection.create(target.state.doc, 1, 7)
    ));
    const beforePaste = target.state.doc.toJSON();
    const clipboard = createClipboardData({
      [canvasInternalClipboardMime]: serialized.internal
    });
    const slice = readQuireClipboardSlice({ editor: target, clipboardData: clipboard });

    expect(slice).not.toBeNull();
    expect(pasteQuireClipboardSlice(
      target,
      slice!,
      { type: "paste", clipboardData: clipboard } as ClipboardEvent
    )).toBe(true);
    expect(applied).toEqual(["direct", "plugin"]);
    expect(target.state.doc.textContent).toBe("Copy");
    expect(target.commands.undo()).toBe(true);
    expect(target.state.doc.toJSON()).toEqual(beforePaste);
  });
});

/** Test-only selection that supplies structural clipboard formats. */
class StructuralClipboardSelection extends TextSelection {
  /**
   * Creates a structural clipboard selection around text positions.
   *
   * @param $anchor - Resolved anchor position.
   * @param $head - Resolved head position.
   */
  constructor($anchor: ResolvedPos, $head: ResolvedPos) {
    super($anchor, $head);
  }

  /**
   * Serializes structural clipboard data for the generic writer.
   *
   * @returns Custom clipboard data.
   */
  serializeClipboard(): {
    readonly slice: Slice;
    readonly plainText: string;
    readonly html: string;
  } {
    return {
      slice: this.content(),
      plainText: "A\tB",
      html: "<table><tbody><tr><td>A</td><td>B</td></tr></tbody></table>"
    };
  }

  /**
   * Maps this selection through document changes.
   *
   * @param doc - Mapped document.
   * @param mapping - Mapping to apply.
   * @returns Mapped test selection.
   */
  override map(doc: PMNode, mapping: Parameters<TextSelection["map"]>[1]): TextSelection {
    const $anchor = doc.resolve(mapping.map(this.anchor));
    const $head = doc.resolve(mapping.map(this.head));

    return new StructuralClipboardSelection($anchor, $head);
  }
}

/**
 * Creates a minimal clipboard data adapter for package tests.
 *
 * @param initialData - Initial MIME data entries.
 * @returns Clipboard adapter backed by an in-memory map.
 */
function createClipboardData(
  initialData: Record<string, string> = {}
): QuireClipboardData {
  const data = new Map(Object.entries(initialData));

  return {
    get types(): readonly string[] {
      return [...data.keys()];
    },
    getData(type: string): string {
      return data.get(type) ?? "";
    },
    setData(type: string, value: string): void {
      data.set(type, value);
    }
  };
}
