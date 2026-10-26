import type { Mark, MarkType } from "@quirekit/pm";
import type { QuireFormattingMutationContext } from "../types";
import { pickAttributes, replaceRangeTextStyle } from "./text-style";
import type { CharacterFormattingSnapshot } from "./types";

/**
 * Applies character format to ranges or stored marks without touching semantic marks.
 *
 * @param context - Shared formatting transaction.
 * @param snapshot - Provider-owned character snapshot.
 * @param preservedMarks - Semantic mark names excluded from replacement.
 * @param preservedTextStyleAttributes - Target textStyle fields retained per run.
 * @returns Whether document or stored marks changed.
 */
export function applyCharacterFormatting(
  context: QuireFormattingMutationContext,
  snapshot: CharacterFormattingSnapshot,
  preservedMarks: ReadonlySet<string>,
  preservedTextStyleAttributes: ReadonlySet<string>
): boolean {
  const beforeSteps = context.tr.steps.length;
  if (context.scope.empty) {
    const current = context.tr.storedMarks
      ?? context.state.storedMarks
      ?? context.tr.selection.$from.marks();
    const next = buildStoredMarks(
      current,
      context.state.schema.marks,
      snapshot,
      preservedMarks,
      preservedTextStyleAttributes
    );
    if (
      JSON.stringify(current.map(mark => mark.toJSON()))
      === JSON.stringify(next.map(mark => mark.toJSON()))
    ) {
      return false;
    }
    context.tr.setStoredMarks(next);
    return true;
  }

  if (context.tr.selection.ranges.every(range => rangeMatchesCharacterFormatting(
    context,
    range.$from.pos,
    range.$to.pos,
    snapshot,
    preservedMarks,
    preservedTextStyleAttributes
  ))) {
    return false;
  }

  for (const range of context.tr.selection.ranges) {
    for (const [name, attrs] of Object.entries(snapshot)) {
      const markType = context.state.schema.marks[name];
      if (markType === undefined || preservedMarks.has(name)) continue;
      if (name === "textStyle") {
        replaceRangeTextStyle(
          context,
          range.$from.pos,
          range.$to.pos,
          markType,
          attrs,
          preservedTextStyleAttributes
        );
        continue;
      }
      context.tr.removeMark(range.$from.pos, range.$to.pos, markType);
      if (attrs !== null) {
        context.tr.addMark(range.$from.pos, range.$to.pos, markType.create(attrs));
      }
    }
  }
  return context.tr.steps.length > beforeSteps;
}

/**
 * Reports whether every text run in a range already has the captured visual state.
 *
 * @param context - Current formatting transaction.
 * @param from - Inclusive range start.
 * @param to - Exclusive range end.
 * @param snapshot - Captured character state.
 * @param preservedMarks - Semantic mark names excluded from comparison.
 * @param preservedTextStyleAttributes - Target-owned textStyle fields.
 * @returns Whether applying this snapshot would be a no-op.
 */
function rangeMatchesCharacterFormatting(
  context: QuireFormattingMutationContext,
  from: number,
  to: number,
  snapshot: CharacterFormattingSnapshot,
  preservedMarks: ReadonlySet<string>,
  preservedTextStyleAttributes: ReadonlySet<string>
): boolean {
  let sawText = false;
  let matches = true;
  context.tr.doc.nodesBetween(from, to, (node) => {
    if (!node.isText || !matches) return matches;
    sawText = true;
    for (const [name, captured] of Object.entries(snapshot)) {
      if (preservedMarks.has(name)) continue;
      const markType = context.state.schema.marks[name];
      if (markType === undefined) continue;
      const current = node.marks.find(mark => mark.type === markType);
      const attrs = name === "textStyle"
        ? {
            ...pickAttributes(
              current?.attrs ?? {},
              preservedTextStyleAttributes
            ),
            ...(captured ?? {})
          }
        : captured;
      const expected = attrs === null
        || (name === "textStyle" && Object.keys(attrs).length === 0)
        ? undefined
        : markType.create(attrs);
      if (
        (current === undefined) !== (expected === undefined)
        || (current !== undefined && expected !== undefined && !current.eq(expected))
      ) {
        matches = false;
        return false;
      }
    }
    return true;
  });
  return sawText && matches;
}

/**
 * Rebuilds stored marks from preserved target semantics and captured visual state.
 *
 * @param current - Current cursor marks.
 * @param markTypes - Schema mark registry.
 * @param snapshot - Captured formatting state.
 * @param preservedMarks - Semantic marks retained from the target.
 * @param preservedTextStyleAttributes - Semantic textStyle fields retained from the target.
 * @returns Complete stored mark set for subsequent typing.
 */
function buildStoredMarks(
  current: readonly Mark[],
  markTypes: Readonly<Record<string, MarkType>>,
  snapshot: CharacterFormattingSnapshot,
  preservedMarks: ReadonlySet<string>,
  preservedTextStyleAttributes: ReadonlySet<string>
): Mark[] {
  const output = current.filter(mark => preservedMarks.has(mark.type.name));
  const currentTextStyle = current.find(mark => mark.type.name === "textStyle");
  for (const [name, attrs] of Object.entries(snapshot)) {
    if (attrs === null || preservedMarks.has(name)) continue;
    const markType = markTypes[name];
    if (markType === undefined) continue;
    const nextAttrs = name === "textStyle"
      ? { ...pickAttributes(currentTextStyle?.attrs ?? {}, preservedTextStyleAttributes), ...attrs }
      : attrs;
    if (name !== "textStyle" || Object.keys(nextAttrs).length > 0) {
      output.push(markType.create(nextAttrs));
    }
  }
  if (snapshot.textStyle === null && currentTextStyle !== undefined) {
    const retained = pickAttributes(
      currentTextStyle.attrs,
      preservedTextStyleAttributes
    );
    const markType = markTypes.textStyle;
    if (markType !== undefined && Object.keys(retained).length > 0) {
      output.push(markType.create(retained));
    }
  }
  return output;
}
