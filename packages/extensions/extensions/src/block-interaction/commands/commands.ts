import { closeHistory, Selection } from "@quirekit/pm";
import type { CommandProps } from "@quirekit/core";
import type { BlockInteractionOptions, BlockMoveRequest, BlockRangeRef } from "../types";
import { blockCatalogKey } from "../identity";
import { resolveBlockRange } from "../scope";
import { BlockSelection } from "../selection";
import { planBlockMove } from "./plan";

/** History durability marker, never used to bypass authorization. */
export const blockOperationMeta = "quireBlockOperation";

/** @param range - Captured source. @returns Canonical selection command. */
export function selectBlockRange(range: BlockRangeRef | null) {
  return (context: CommandProps): boolean => {
    if (range === null) {
      if (context.tr.selection.empty) return false;
      if (context.dispatch) context.tr.setSelection(Selection.near(context.tr.selection.$from));
      return true;
    }
    const catalog = blockCatalogKey.getState(context.state);
    if (!catalog || catalog.doc !== context.tr.doc) return false;
    const blocks = resolveBlockRange(catalog, range);
    const first = blocks?.[0], last = blocks?.at(-1);
    if (!first || !last) return false;
    const selection = BlockSelection.create(context.tr.doc, first.from, last.to);
    if (!selection) return false;
    if (context.dispatch) context.tr.setSelection(selection);
    return true;
  };
}

/** @param request - Captured move. @param options - Feature admission. @returns Canonical atomic move. */
export function moveBlockRange(request: BlockMoveRequest, options: BlockInteractionOptions) {
  return (context: CommandProps): boolean => {
    const plan = planBlockMove(context, options, request);
    if (!plan) return false;
    if (context.dispatch) {
      closeHistory(context.tr);
      for (const step of plan.transform.steps) context.tr.step(step);
      const selection = BlockSelection.create(context.tr.doc, plan.from, plan.to);
      if (selection) context.tr.setSelection(selection);
      context.tr.setMeta(blockOperationMeta, true);
    }
    return true;
  };
}
