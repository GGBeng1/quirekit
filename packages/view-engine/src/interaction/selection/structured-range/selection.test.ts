import { createEditor } from "@quirekit/core";
import {
  Selection,
  Slice,
  TextSelection
} from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import {
  QuireStructuredRangeSelection,
  type QuireStructuredRangePlan,
  type QuireStructuredRangeStructureSegment
} from ".";

describe("QuireStructuredRangeSelection", () => {
  it("preserves logical direction and exact source-ordered ranges", () => {
    const editor = createTextEditor();
    const selection = QuireStructuredRangeSelection.create(
      editor.state.doc,
      createMixedPlan()
    );

    expect(selection.anchor).toBe(10);
    expect(selection.head).toBe(1);
    expect(selection.direction).toBe("backward");
    expect(selection.ranges.map((range) => ({
      from: range.$from.pos,
      to: range.$to.pos
    }))).toEqual([
      { from: 1, to: 3 },
      { from: 4, to: 6 },
      { from: 8, to: 10 }
    ]);
    expect(selection.eq(QuireStructuredRangeSelection.create(
      editor.state.doc,
      createMixedPlan()
    ))).toBe(true);
  });

  it("round-trips through the ProseMirror selection JSON registry", () => {
    const editor = createTextEditor();
    const selection = QuireStructuredRangeSelection.create(
      editor.state.doc,
      createMixedPlan()
    );
    const restored = Selection.fromJSON(
      editor.state.doc,
      selection.toJSON()
    );

    expect(restored).toBeInstanceOf(QuireStructuredRangeSelection);
    expect(restored.eq(selection)).toBe(true);
  });

  it("rejects malformed persisted structure metadata", () => {
    const editor = createTextEditor();

    expect(() => Selection.fromJSON(editor.state.doc, {
      type: "quireStructuredRange",
      anchor: 1,
      head: 8,
      direction: "forward",
      segments: [{
        kind: "structure",
        range: { from: 1, to: 8 }
      }]
    })).toThrow(RangeError);
  });

  it("maps logical endpoints, owner identity, units, and text ranges", () => {
    const editor = createTextEditor();
    const selection = QuireStructuredRangeSelection.create(
      editor.state.doc,
      createMixedPlan()
    );
    const transaction = editor.state.pm.tr.insertText("X", 1);
    const mapped = selection.map(transaction.doc, transaction.mapping);

    expect(mapped).toBeInstanceOf(QuireStructuredRangeSelection);
    expect(mapped).toMatchObject({
      anchor: 11,
      head: 2,
      segments: [{
        kind: "text",
        range: { from: 2, to: 4 }
      }, {
        kind: "structure",
        ownerId: "paragraph-adapter@0",
        ownerRange: { from: 0, to: 12 },
        range: { from: 5, to: 7 },
        units: [{
          id: "middle",
          range: { from: 5, to: 7 }
        }]
      }, {
        kind: "text",
        range: { from: 9, to: 11 }
      }]
    });
  });

  it("does not absorb content inserted immediately after a structural owner", () => {
    const editor = createTextEditor();
    const selection = QuireStructuredRangeSelection.create(
      editor.state.doc,
      createMixedPlan()
    );
    const paragraph = editor.state.schema.nodes.paragraph?.createAndFill();
    if (paragraph === undefined || paragraph === null) {
      throw new Error("Expected paragraph schema node.");
    }
    const transaction = editor.state.pm.tr.insert(
      editor.state.doc.content.size,
      paragraph
    );
    const mapped = selection.map(transaction.doc, transaction.mapping);

    expect(mapped).toBeInstanceOf(QuireStructuredRangeSelection);
    expect(mapped).toMatchObject({
      segments: [
        expect.objectContaining({ kind: "text" }),
        expect.objectContaining({
          kind: "structure",
          ownerRange: { from: 0, to: 11 },
          units: [expect.objectContaining({
            range: { from: 4, to: 6 }
          })]
        }),
        expect.objectContaining({ kind: "text" })
      ]
    });
  });

  it("copies only selected discontiguous ranges", () => {
    const editor = createTextEditor();
    const selection = QuireStructuredRangeSelection.create(
      editor.state.doc,
      createTextGapPlan()
    );
    const copiedText = selection.content().content.textBetween(
      0,
      selection.content().content.size,
      "\n"
    );

    expect(copiedText.replaceAll("\n", "")).toBe("abfg");
  });

  it("deletes exact text gaps without removing unselected middle content", () => {
    const editor = createTextEditor();
    const selection = QuireStructuredRangeSelection.create(
      editor.state.doc,
      createTextGapPlan()
    );
    const transaction = editor.state.pm.tr;

    selection.replace(transaction, Slice.empty);

    expect(transaction.doc.textContent).toBe("cdehi");
  });

  it("safely rejects generic replacement for protected structural domains", () => {
    const editor = createTextEditor();
    const selection = QuireStructuredRangeSelection.create(
      editor.state.doc,
      createMixedPlan()
    );
    const transaction = editor.state.pm.tr;

    selection.replace(transaction, Slice.empty);

    expect(transaction.doc.eq(editor.state.doc)).toBe(true);
    expect(transaction.steps).toHaveLength(0);
  });

  it("falls back near the logical head when mapping removes a nearest owner", () => {
    const editor = createTextEditor();
    const plan = createMixedPlan({
      structure: {
        mappingFallback: "nearest",
        replacementFallback: "owner"
      }
    });
    const selection = QuireStructuredRangeSelection.create(
      editor.state.doc,
      plan
    );
    const transaction = editor.state.pm.tr.delete(
      plan.segments[1]!.kind === "structure"
        ? plan.segments[1]!.ownerRange.from
        : 0,
      plan.segments[1]!.kind === "structure"
        ? plan.segments[1]!.ownerRange.to
        : editor.state.doc.content.size
    );
    const mapped = selection.map(transaction.doc, transaction.mapping);

    expect(mapped).not.toBeInstanceOf(QuireStructuredRangeSelection);
    expect(mapped).toBeInstanceOf(TextSelection);
  });

  it("keeps a nearest fallback position mapped across later transactions", () => {
    const editor = createTextEditor();
    const plan = createMixedPlan({
      structure: {
        mappingFallback: "nearest",
        replacementFallback: "owner"
      }
    });
    const selection = QuireStructuredRangeSelection.create(
      editor.state.doc,
      plan
    );
    const removed = editor.state.pm.tr.delete(0, 11);
    const afterRemoval = editor.state.pm.apply(removed);
    const paragraph = afterRemoval.schema.nodes.paragraph?.createAndFill();
    if (!paragraph) throw new Error("Expected paragraph schema node");
    const inserted = afterRemoval.tr.insert(0, paragraph);
    const mapped = selection.getBookmark()
      .map(removed.mapping)
      .map(inserted.mapping)
      .resolve(inserted.doc);

    expect(mapped).toBeInstanceOf(TextSelection);
    expect(mapped.head).toBeGreaterThan(0);
  });
});

/**
 * Creates a single-paragraph editor with stable source positions.
 *
 * @returns Editor containing the text `abcdefghi`.
 */
function createTextEditor() {
  return createEditor({
    extensions: [StarterKit.configure({ undoRedo: false })],
    content: {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "abcdefghi" }]
      }]
    }
  });
}

/**
 * Creates a mixed text and adapter-owned plan over one paragraph.
 *
 * @param options - Optional structural fallback overrides.
 * @returns Backward logical structured selection plan.
 */
function createMixedPlan(options: {
  readonly structure?: Partial<QuireStructuredRangeStructureSegment>;
} = {}): QuireStructuredRangePlan {
  const structure: QuireStructuredRangeStructureSegment = {
    kind: "structure",
    ownerId: "paragraph-adapter@0",
    adapterId: "paragraph-adapter",
    nodeType: "paragraph",
    ownerRange: { from: 0, to: 11 },
    range: { from: 4, to: 6 },
    units: [{
      id: "middle",
      kind: "paragraph-fragment",
      range: { from: 4, to: 6 }
    }],
    commandDomain: "paragraph-fragment",
    clipboardDomain: "paragraph-fragment",
    mappingFallback: "text",
    replacementFallback: "reject",
    ...options.structure
  };
  return {
    anchor: 10,
    head: 1,
    direction: "backward",
    requiresStructuredSelection: true,
    segments: [{
      kind: "text",
      range: { from: 1, to: 3 }
    }, structure, {
      kind: "text",
      range: { from: 8, to: 10 }
    }]
  };
}

/**
 * Creates a discontiguous text-only plan with an unselected middle gap.
 *
 * @returns Forward logical structured selection plan.
 */
function createTextGapPlan(): QuireStructuredRangePlan {
  return {
    anchor: 1,
    head: 8,
    direction: "forward",
    requiresStructuredSelection: true,
    segments: [{
      kind: "text",
      range: { from: 1, to: 3 }
    }, {
      kind: "text",
      range: { from: 6, to: 8 }
    }]
  };
}
