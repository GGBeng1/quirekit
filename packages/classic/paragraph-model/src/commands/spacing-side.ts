import type { CommandSpec } from "@quirekit/core";
import type { SetWordParagraphSpacingSideOptions } from "./types";
import { updateSelectedSpacing } from "./spacing";

/**
 * Creates a single-side spacing command preserving every other direct field.
 * @param paragraphNodeNames - Registered textblock owners.
 * @returns Command accepting twips or hundredths of a line.
 */
export function createSetWordParagraphSpacingSideCommand(paragraphNodeNames: readonly string[]): CommandSpec {
  return (value) => (context) => {
    if (!context.editor.isEditable || !isSpacingSideOptions(value)) return false;
    const { side, unit, value: amount } = value;
    const changed = updateSelectedSpacing({ ...context, dispatch: undefined }, paragraphNodeNames, current => {
      // Explicit zeros disable the inherited alternative unit. Null would restore
      // that inherited value and make a user's unit choice ineffective.
      const next = { ...current, [side]: { unit: "dxa", value: unit === "dxa" ? amount : 0 },
        [`${side}Lines`]: unit === "line" ? amount : 0, [`${side}AutoSpacing`]: false };
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    }, true);
    if (!changed) return false;
    // The complete selection must pass existing filters in can() as well as run().
    if (!context.editor.state.pm.filterTransaction(context.tr)) {
      context.tr.setMeta("preventDispatch", true); return false;
    }
    context.dispatch?.(context.tr);
    return true;
  };
}

/** @param value - Command input. @returns Whether it is a complete valid side intent. */
function isSpacingSideOptions(value: unknown): value is SetWordParagraphSpacingSideOptions {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<SetWordParagraphSpacingSideOptions>;
  return (candidate.side === "before" || candidate.side === "after")
    && (candidate.unit === "dxa" || candidate.unit === "line")
    && typeof candidate.value === "number" && Number.isSafeInteger(candidate.value) && candidate.value >= 0;
}
