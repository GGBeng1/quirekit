import {
  createEditor,
  Node,
  type QuireEditor,
  type QuireJSONContent
} from "@quirekit/core";
import {
  Decoration,
  DecorationSet,
  type EditorState,
  type DecorationSource
} from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { Focus } from "./focus";
import { Placeholder, preparePlaceholderAttribute } from "./placeholder";
import { Selection } from "./selection";

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

describe("decoration extensions", () => {
  it("marks the focused node with a node decoration", () => {
    const editor = createEditor({
      extensions: [
        ...baseExtensions,
        Focus.configure({ className: "is-focused" })
      ],
      content: paragraphDoc("hello")
    });

    editor.isFocused = true;
    expect(editor.commands.setTextSelection(2)).toBe(true);

    const decorations = collectDecorations(editor);

    expect(decorations).toHaveLength(1);
    expect(readAttrs(decorations[0]!)).toEqual({ class: "is-focused" });
  });

  it("decorates empty nodes with placeholder metadata", () => {
    const editor = createEditor({
      extensions: [
        ...baseExtensions,
        Placeholder.configure({
          placeholder: "Write",
          dataAttribute: "Prompt Label"
        })
      ],
      content: paragraphDoc("")
    });

    const decorations = collectDecorations(editor);

    expect(preparePlaceholderAttribute("Prompt Label")).toBe("prompt-label");
    expect(decorations).toHaveLength(1);
    expect(readAttrs(decorations[0]!)).toEqual({
      class: "is-empty is-editor-empty",
      "data-prompt-label": "Write"
    });
  });

  it("decorates selected text while the editor is blurred", () => {
    const editor = createEditor({
      extensions: [
        ...baseExtensions,
        Selection.configure({ className: "visible-selection" })
      ],
      content: paragraphDoc("hello")
    });

    expect(editor.commands.setTextSelection({ from: 1, to: 6 })).toBe(true);

    const decorations = collectDecorations(editor);

    expect(decorations).toHaveLength(1);
    expect(readAttrs(decorations[0]!)).toEqual({ class: "visible-selection" });

    editor.isFocused = true;
    expect(collectDecorations(editor)).toHaveLength(0);
  });

  it("exports the unconfigured decoration extension instances", () => {
    expect(Focus.name).toBe("focus");
    expect(Placeholder.name).toBe("placeholder");
    expect(Selection.name).toBe("selection");
  });
});

/**
 * Collects decorations from plugin props for a test editor.
 *
 * @param editor - Editor whose plugin decorations should be inspected.
 * @returns Decorations returned by every plugin prop.
 */
function collectDecorations(editor: QuireEditor): readonly Decoration[] {
  const decorations: Decoration[] = [];

  for (const plugin of editor.state.pm.plugins) {
    const decorationsProp = plugin.props.decorations as
      | ((state: EditorState) => DecorationSource | null | undefined)
      | undefined;
    const source = decorationsProp?.(editor.state.pm);

    appendDecorationSource(source, decorations);
  }

  return decorations;
}

/**
 * Appends decorations from one source.
 *
 * @param source - Decoration source returned by a plugin prop.
 * @param decorations - Mutable output list.
 */
function appendDecorationSource(
  source: DecorationSource | null | undefined,
  decorations: Decoration[]
): void {
  if (source instanceof DecorationSet) {
    decorations.push(...source.find());
  }
}

/**
 * Reads decoration attrs from a ProseMirror decoration.
 *
 * @param decoration - Decoration to inspect.
 * @returns Decoration attrs.
 */
function readAttrs(decoration: Decoration): Record<string, unknown> {
  return (
    (decoration.type as unknown as { readonly attrs?: Record<string, unknown> })
      .attrs ?? {}
  );
}

/**
 * Creates a one-paragraph JSON document for decoration tests.
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
        ...(text
          ? { content: [{ type: "text", text }] }
          : {})
      }
    ]
  };
}
