import { Extension, setQuireTransactionRenderImpact } from "@quirekit/core";
import { Plugin, TextSelection, type Transaction } from "@quirekit/pm";
import { afterEach, describe, expect, it } from "vitest";
import { createFixtureEditor } from "../../test-support/frame-layout-reuse";
import { deriveQuireViewUpdatePatch } from "./update-patch";

const editors: ReturnType<typeof createFixtureEditor>[] = [];
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));

describe("presentation transaction invalidation proof", () => {
  it("admits complete presentation batches and generic selection companions", () => {
    const editor = fixture();
    const hover = presentation(editor);
    const leave = presentation(editor);
    const selection = editor.state.pm.tr.setSelection(TextSelection.create(editor.state.doc, 2));
    expect(deriveQuireViewUpdatePatch({ reason: "transaction", transactions: [hover, leave] }))
      .toMatchObject({ causes: ["presentation"], invalidatedProducts: ["overlay"], selectionChanged: false });
    expect(deriveQuireViewUpdatePatch({ reason: "transaction", transactions: [selection, hover] }))
      .toMatchObject({ causes: ["selection", "presentation"], invalidatedProducts: ["overlay"] });
  });

  it.each(["metadata", "metadata-selection", "empty"])("rejects unknown %s companions", (kind) => {
    const editor = fixture();
    const unknown = editor.state.pm.tr;
    if (kind !== "empty") unknown.setMeta("unknown-feature", true);
    if (kind === "metadata-selection") unknown.setSelection(TextSelection.create(editor.state.doc, 2));
    expect(deriveQuireViewUpdatePatch({
      reason: "transaction", transactions: [presentation(editor), unknown]
    }).invalidatedProducts).toEqual(["layout", "content", "overlay"]);
  });

  it("preserves stronger document, composition and explicit dirty evidence", () => {
    const editor = fixture();
    const changed = presentation(editor).insertText("x", 1);
    expect(deriveQuireViewUpdatePatch({ reason: "transaction", transactions: [changed] }))
      .toMatchObject({ docChanged: true, invalidatedProducts: ["layout", "content", "overlay"] });
    const appended = editor.state.pm.tr.insertText("x", 1);
    expect(deriveQuireViewUpdatePatch({ reason: "transaction", transactions: [presentation(editor), appended] }))
      .toMatchObject({ docChanged: true, invalidatedProducts: ["layout", "content", "overlay"] });
    expect(deriveQuireViewUpdatePatch({
      reason: "transaction", transactions: [presentation(editor).setMeta("composition", 1)]
    }).causes).not.toContain("presentation");
    expect(deriveQuireViewUpdatePatch({
      reason: "transaction", transactions: [presentation(editor)], layoutDirtyRange: {
        reason: "fallback", changedRange: { from: 1, to: 2 }, firstTopLevelBlockIndex: 0,
        firstTopLevelBlockRange: { from: 0, to: editor.state.doc.content.size }
      }
    }).invalidatedProducts).toEqual(["layout", "content", "overlay"]);
  });

  it.each(["resize", "font-epoch", "image-epoch", "manual", "document-replace"])(
    "does not override %s", (reason) => {
      const editor = fixture();
      expect(deriveQuireViewUpdatePatch({ reason, transactions: [presentation(editor)] })
        .invalidatedProducts).toContain("layout");
    }
  );

  it("keeps ordinary unmarked metadata on fallback", () => {
    const editor = fixture();
    expect(deriveQuireViewUpdatePatch({
      reason: "transaction", transactions: [editor.state.pm.tr.setMeta("feature", true)]
    }).causes).toEqual(["fallback"]);
  });

  it.each([false, true])("includes real Core appended transactions (docChanged=%s)", (changeDocument) => {
    const editor = createFixtureEditor(1, [Extension.create({
      name: "unknown-append",
      addProseMirrorPlugins: () => [new Plugin({
        appendTransaction: (transactions, _previous, state) => {
          if (!transactions.some(tr => tr.getMeta("feature") === true)) return null;
          return changeDocument ? state.tr.insertText("x", 1) : state.tr.setMeta("unknown", true);
        }
      })]
    })]);
    editors.push(editor);
    let transactions: readonly Transaction[] = [];
    editor.on("transaction", event => {
      transactions = [event.transaction, ...event.appendedTransactions];
    });
    editor.dispatchTransaction(presentation(editor));
    expect(transactions).toHaveLength(2);
    expect(deriveQuireViewUpdatePatch({ reason: "transaction", transactions }))
      .toMatchObject({ docChanged: changeDocument, invalidatedProducts: ["layout", "content", "overlay"] });
  });
});

/** @returns Owned editor with a real immutable source document. */
function fixture() {
  const editor = createFixtureEditor();
  editors.push(editor);
  return editor;
}

/**
 * Declares one complete feature metadata transaction.
 * @param editor - Editor providing the transaction's starting state.
 * @returns Presentation-only transaction.
 */
function presentation(editor: ReturnType<typeof createFixtureEditor>) {
  return setQuireTransactionRenderImpact(editor.state.pm.tr.setMeta("feature", true), {
    kind: "presentation-only"
  });
}
