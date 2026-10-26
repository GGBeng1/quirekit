import type { CommandSpec } from "@quirekit/core";
import type {
  SetWordTaskCheckedOptions,
  ToggleWordTaskAtPositionOptions
} from "../types";
import { resolveWordParagraphNumbering } from "../model";
import { collectWordNumberingCommandTargets } from "./targets";

/**
 * Creates a selected-task checked-state command.
 *
 * @param mode - Toggle current aggregate state or accept an explicit payload.
 * @param paragraphTypes - Registered paragraph-like node names.
 * @returns Task-state command.
 */
export function createSetWordTaskCheckedCommand(
  mode: "toggle" | "set",
  paragraphTypes: readonly string[]
): CommandSpec {
  return (value) => (context) => {
    const targets = collectWordNumberingCommandTargets(context, paragraphTypes)
      .map((target) => ({
        target,
        numbering: resolveWordParagraphNumbering(target.node.attrs.wordNumbering)
      }))
      .filter((entry) => entry.numbering?.task !== null && entry.numbering !== null);
    if (targets.length === 0) return false;
    const checked = mode === "toggle"
      ? !targets.every(({ numbering }) => numbering?.task?.checked === true)
      : readChecked(value);
    if (checked === undefined) return false;
    let changed = false;
    for (const { target, numbering } of targets) {
      if (numbering === null || numbering.task === null) continue;
      if (numbering.task.checked === checked) continue;
      context.tr.setNodeMarkup(target.position, undefined, {
        ...target.node.attrs,
        wordNumbering: { ...numbering, task: { checked } }
      });
      changed = true;
    }
    if (!changed) return false;
    context.dispatch?.(context.tr);
    return true;
  };
}

/**
 * Creates a position-targeted task toggle used by retained marker actions.
 *
 * @param paragraphTypes - Registered paragraph-like node names.
 * @returns Command that toggles exactly one task paragraph without moving selection.
 */
export function createToggleWordTaskAtPositionCommand(
  paragraphTypes: readonly string[]
): CommandSpec {
  const allowedTypes = new Set(paragraphTypes);
  return (value) => (context) => {
    const position = readTaskPosition(value);
    if (position === undefined) return false;
    const node = context.state.doc.nodeAt(position);
    if (node === null || !node.isTextblock || !allowedTypes.has(node.type.name)) {
      return false;
    }
    const numbering = resolveWordParagraphNumbering(node.attrs.wordNumbering);
    if (numbering?.task === null || numbering?.task === undefined) return false;
    context.tr.setNodeMarkup(position, undefined, {
      ...node.attrs,
      wordNumbering: {
        ...numbering,
        task: { checked: !numbering.task.checked }
      }
    });
    context.dispatch?.(context.tr);
    return true;
  };
}

/**
 * Reads an explicit checked-state command payload.
 *
 * @param value - Candidate command payload.
 * @returns Checked boolean or undefined when invalid.
 */
function readChecked(value: unknown): boolean | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const checked = (value as SetWordTaskCheckedOptions).checked;
  return typeof checked === "boolean" ? checked : undefined;
}

/**
 * Reads one exact task paragraph position from a command payload.
 *
 * @param value - Candidate command payload.
 * @returns Non-negative document position, or undefined when invalid.
 */
function readTaskPosition(value: unknown): number | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const position = (value as ToggleWordTaskAtPositionOptions).position;
  return Number.isInteger(position) && position >= 0 ? position : undefined;
}
