import { createEditor } from "@quirekit/core";
import type { Selection as ProseMirrorSelection } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import type { QuireLayoutSnapshot } from "@quirekit/view-engine";
import { shouldMaterializeMountedSelectionTextblock } from "./materialization";

describe("shouldMaterializeMountedSelectionTextblock", () => {
  it("requests materialization when the selected textblock has no fragments", () => {
    const editor = createParagraphEditor(["One", "Two"]);
    const secondFrom = editor.state.doc.child(0).nodeSize;

    expect(editor.commands.setTextSelection(secondFrom + 2)).toBe(true);

    expect(
      shouldMaterializeMountedSelectionTextblock({
        snapshot: createSnapshot({
          docSize: editor.state.doc.content.size,
          children: [
            createTextblockNode("paragraph-0", 0, editor.state.doc.child(0).nodeSize, true),
            createTextblockNode(
              "paragraph-1",
              secondFrom,
              secondFrom + editor.state.doc.child(1).nodeSize,
              false
            )
          ]
        }),
        selection: editor.state.pm.selection
      })
    ).toBe(true);
  });

  it("keeps overlay-only selection updates for materialized textblocks", () => {
    const editor = createParagraphEditor(["One", "Two"]);
    const secondFrom = editor.state.doc.child(0).nodeSize;

    expect(editor.commands.setTextSelection(secondFrom + 2)).toBe(true);

    expect(
      shouldMaterializeMountedSelectionTextblock({
        snapshot: createSnapshot({
          docSize: editor.state.doc.content.size,
          children: [
            createTextblockNode("paragraph-0", 0, editor.state.doc.child(0).nodeSize, true),
            createTextblockNode(
              "paragraph-1",
              secondFrom,
              secondFrom + editor.state.doc.child(1).nodeSize,
              true
            )
          ]
        }),
        selection: editor.state.pm.selection
      })
    ).toBe(false);
  });

  it("requests materialization when a selected text range has no fragments", () => {
    const editor = createParagraphEditor(["One"]);

    expect(editor.commands.setTextSelection({ from: 1, to: 4 })).toBe(true);

    expect(
      shouldMaterializeMountedSelectionTextblock({
        snapshot: createSnapshot({
          docSize: editor.state.doc.content.size,
          children: [
            createTextblockNode("paragraph-0", 0, editor.state.doc.child(0).nodeSize, false)
          ]
        }),
        selection: editor.state.pm.selection
      })
    ).toBe(true);
  });

  it("keeps overlay-only range selections when selected text is materialized", () => {
    const editor = createParagraphEditor(["One"]);

    expect(editor.commands.setTextSelection({ from: 1, to: 4 })).toBe(true);

    expect(
      shouldMaterializeMountedSelectionTextblock({
        snapshot: createSnapshot({
          docSize: editor.state.doc.content.size,
          children: [
            createTextblockNode("paragraph-0", 0, editor.state.doc.child(0).nodeSize, true)
          ]
        }),
        selection: editor.state.pm.selection
      })
    ).toBe(false);
  });

  it("requests materialization for select-all when text fragments are absent", () => {
    const editor = createParagraphEditor(["One", "Two"]);

    expect(editor.commands.selectAll()).toBe(true);

    expect(
      shouldMaterializeMountedSelectionTextblock({
        snapshot: createSnapshot({
          docSize: editor.state.doc.content.size,
          children: [
            createTextblockNode("paragraph-0", 0, editor.state.doc.child(0).nodeSize, false),
            createTextblockNode(
              "paragraph-1",
              editor.state.doc.child(0).nodeSize,
              editor.state.doc.content.size,
              false
            )
          ]
        }),
        selection: editor.state.pm.selection
      })
    ).toBe(true);
  });

  it("keeps overlay-only updates outside textblocks", () => {
    const editor = createParagraphEditor(["One"]);

    expect(
      shouldMaterializeMountedSelectionTextblock({
        snapshot: createSnapshot({
          docSize: editor.state.doc.content.size,
          children: [
            createTextblockNode("paragraph-0", 0, editor.state.doc.child(0).nodeSize, true)
          ]
        }),
        selection: createNonTextblockSelection()
      })
    ).toBe(false);
  });
});

/**
 * Creates an editor with one paragraph per supplied text value.
 *
 * @param texts - Paragraph text values.
 * @returns Editor with a StarterKit paragraph document.
 */
function createParagraphEditor(texts: readonly string[]) {
  const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false })] });
  const docType = editor.state.schema.nodes.doc;
  const paragraphType = editor.state.schema.nodes.paragraph;

  if (!docType || !paragraphType) {
    throw new Error("StarterKit schema did not provide doc and paragraph nodes.");
  }

  editor.setContent(
    docType.create(
      null,
      texts.map((text) => paragraphType.create(null, editor.state.schema.text(text)))
    )
  );

  return editor;
}

/**
 * Creates the minimal selection shape for a non-textblock head.
 *
 * @returns Selection-like object whose head parent is not a textblock.
 */
function createNonTextblockSelection(): ProseMirrorSelection {
  return {
    $head: {
      depth: 0,
      parent: { isTextblock: false }
    }
  } as unknown as ProseMirrorSelection;
}

/**
 * Creates a minimal layout snapshot for selection materialization tests.
 *
 * @param input - Document size and direct root children.
 * @returns Layout snapshot shape consumed by the helper.
 */
function createSnapshot(input: {
  /** Document content size. */
  readonly docSize: number;
  /** Direct root child layout nodes. */
  readonly children: QuireLayoutSnapshot["root"]["children"];
}): QuireLayoutSnapshot {
  const children = input.children;

  return {
    state: {} as QuireLayoutSnapshot["state"],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: input.docSize },
      rect: { x: 0, y: 0, width: 100, height: 100 },
      ...(children === undefined ? {} : { children })
    },
    documentRect: { x: 0, y: 0, width: 100, height: 100 },
    viewportRect: { x: 0, y: 0, width: 100, height: 100 },
    domOverlays: [],
    hitTargets: []
  };
}

/**
 * Creates a direct textblock layout node.
 *
 * @param id - Layout node id.
 * @param from - Document range start.
 * @param to - Document range end.
 * @param materialized - Whether the node owns real text fragments.
 * @returns Layout node for a paragraph.
 */
function createTextblockNode(
  id: string,
  from: number,
  to: number,
  materialized: boolean
): NonNullable<QuireLayoutSnapshot["root"]["children"]>[number] {
  return {
    id,
    kind: "block",
    range: { from, to },
    rect: { x: 0, y: 0, width: 100, height: 24 },
    ...(materialized
      ? {
          textFragments: [
            {
              id: `${id}:text-0`,
              text: "x",
              range: { from: from + 1, to: from + 2 },
              rect: { x: 0, y: 0, width: 10, height: 24 },
              font: "16px sans-serif",
              lineHeight: 24,
              baseline: 18,
              caretStops: [
                { position: { pos: from + 1, bias: 1 }, localX: 0 },
                { position: { pos: from + 2, bias: -1 }, localX: 10 }
              ]
            }
          ]
        }
      : {}),
    children: []
  };
}
