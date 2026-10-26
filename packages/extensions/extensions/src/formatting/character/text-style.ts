import type { MarkType } from "@quirekit/pm";
import type { QuireFormattingMutationContext } from "../types";

/**
 * Replaces textStyle attributes per text run while retaining target-owned semantic fields.
 *
 * @param context - Shared formatting transaction.
 * @param from - Inclusive range start.
 * @param to - Exclusive range end.
 * @param markType - textStyle schema mark.
 * @param capturedAttributes - Captured visual attributes, or null for clear/off.
 * @param preservedAttributes - Semantic textStyle fields retained from each target run.
 */
export function replaceRangeTextStyle(
  context: QuireFormattingMutationContext,
  from: number,
  to: number,
  markType: MarkType,
  capturedAttributes: Readonly<Record<string, unknown>> | null,
  preservedAttributes: ReadonlySet<string>
): void {
  const targets: Array<{
    readonly from: number;
    readonly to: number;
    readonly retained: Record<string, unknown>;
  }> = [];
  context.tr.doc.nodesBetween(from, to, (node, position) => {
    if (!node.isText) return;
    const mark = node.marks.find(candidate => candidate.type === markType);
    targets.push({
      from: Math.max(position, from),
      to: Math.min(position + node.nodeSize, to),
      retained: pickAttributes(mark?.attrs ?? {}, preservedAttributes)
    });
  });
  for (const target of targets) {
    context.tr.removeMark(target.from, target.to, markType);
    const attrs = { ...target.retained, ...(capturedAttributes ?? {}) };
    if (Object.keys(attrs).length > 0) {
      context.tr.addMark(target.from, target.to, markType.create(attrs));
    }
  }
}

/**
 * Selects named non-null attributes.
 *
 * @param source - Complete mark attributes.
 * @param names - Attribute names to retain.
 * @returns Minimal retained attribute bag.
 */
export function pickAttributes(
  source: Readonly<Record<string, unknown>>,
  names: ReadonlySet<string>
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const name of names) {
    const value = source[name];
    if (value !== null && value !== undefined) output[name] = value;
  }
  return output;
}
