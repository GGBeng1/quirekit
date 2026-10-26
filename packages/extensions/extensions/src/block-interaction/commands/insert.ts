import { QuireCommandManager, type CommandProps } from "@quirekit/core";
import { closeHistory, Selection, Transaction, Transform, ReplaceStep, Slice, Fragment } from "@quirekit/pm";
import type { BlockInteractionOptions, BlockInsertRequest } from "../types";
import { blockCatalogKey } from "../identity";
import { createBlockCatalog, resolveBlockRef } from "../scope";
import { blockOperationMeta } from "./commands";

/** @param request - Captured slot and optional semantic initializer. @param options - Feature admission. @returns One atomic insertion command. */
export function insertBlockAt(request: BlockInsertRequest, options: BlockInteractionOptions) {
  return (context: CommandProps): boolean => {
    const stored = blockCatalogKey.getState(context.state);
    if (!context.editor.isEditable || !stored || stored.revision !== request.destination.expectedDocumentRevision) return false;
    const catalog = stored.doc === context.tr.doc ? stored : createBlockCatalog(context.tr.doc, options, stored.rootId, stored.revision);
    const target = resolveBlockRef(catalog, request.destination.target);
    if (!target) return false;
    const replace = request.replaceEmpty === true && target.node.type.name === "paragraph" && target.node.content.size === 0;
    const position = replace || request.destination.side === "before" ? target.from : target.to;
    if (options.admit({ editor: context.editor, doc: context.tr.doc, source: replace ? [target] : [], target, position })) return false;

    // Validate the exact structural replacement before letting a feature own its
    // content. Capability checks simulate the same command in a detached transaction.
    const transform = new Transform(context.tr.doc);
    try {
      const content = context.state.schema.nodeFromJSON(request.content ?? { type: "paragraph" });
      if (!options.types.includes(content.type.name)) return false;
      content.check();
      transform.step(new ReplaceStep(position, replace ? target.to : position, new Slice(Fragment.from(content), 0, 0)));
    } catch { return false; }
    const transaction = context.dispatch ? context.tr : new Transaction(context.state);
    for (const step of transform.steps) transaction.step(step);
    transaction.setSelection(Selection.near(transaction.doc.resolve(position + 1))).setStoredMarks(null);
    const manager = new QuireCommandManager({ editor: context.editor, state: context.state });
    try {
      if (request.initialize && !request.initialize(manager.buildProps(transaction))) {
        transaction.setMeta("preventDispatch", true);
        return false;
      }
    } catch {
      transaction.setMeta("preventDispatch", true);
      return false;
    }
    // A rejected initializer cannot leak its prepared paragraph or partial steps.
    // Successful owner metadata stays on this very transaction, including history.
    closeHistory(transaction).setMeta(blockOperationMeta, true).scrollIntoView();
    return true;
  };
}
