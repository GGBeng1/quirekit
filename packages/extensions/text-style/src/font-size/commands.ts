import {
  setMark,
  type CommandProps,
  type CommandSpec
} from "@quirekit/core";

/** Word-compatible common font-size progression in points. */
export const wordFontSizeSteps = Object.freeze([
  8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72
]);

/**
 * Creates a validated direct font-size command.
 *
 * @returns Command accepting a point number, numeric string, or `pt` string.
 */
export function setValidatedFontSizeCommand(): CommandSpec {
  return (value) => (context) => {
    const normalized = normalizeFontSize(value);
    return normalized === null
      ? false
      : setMark("textStyle", { fontSize: normalized })(context);
  };
}

/**
 * Creates a validated direct complex-script font-size command.
 *
 * @returns Command accepting a point number, numeric string, or `pt` string.
 */
export function setValidatedComplexScriptFontSizeCommand(): CommandSpec {
  return (value) => (context) => {
    const normalized = normalizeFontSize(value);
    return normalized === null
      ? false
      : setMark("textStyle", { fontSizeComplexScript: normalized })(context);
  };
}

/**
 * Creates a Word-compatible grow or shrink font-size command.
 *
 * @param increase - Whether to choose the next larger size.
 * @returns Atomic command that preserves mixed direct sizes.
 */
export function changeFontSizeCommand(increase: boolean): CommandSpec {
  return () => (context) => {
    const markType = context.state.schema.marks.textStyle;
    if (markType === undefined) return false;
    if (context.tr.selection.empty) {
      const current = readCollapsedFontSize(context);
      return setMark("textStyle", {
        fontSize: `${getNextFontSize(current, increase)}pt`
      })(context);
    }

    // Each selected text fragment advances from its own direct value so a
    // mixed-size selection remains mixed after one atomic history step.
    for (const range of context.tr.selection.ranges) {
      context.tr.doc.nodesBetween(
        range.$from.pos,
        range.$to.pos,
        (node, position) => {
          if (!node.isText) return;
          const currentMark = node.marks.find((mark) => mark.type === markType);
          const current = readPointSize(currentMark?.attrs.fontSize) ?? 12;
          const from = Math.max(position, range.$from.pos);
          const to = Math.min(position + node.nodeSize, range.$to.pos);
          context.tr.removeMark(from, to, markType);
          context.tr.addMark(from, to, markType.create({
            ...currentMark?.attrs,
            fontSize: `${getNextFontSize(current, increase)}pt`
          }));
        }
      );
    }
    context.dispatch?.(context.tr.scrollIntoView());
    return true;
  };
}

/**
 * Normalizes one public font-size argument.
 *
 * @param value - Point number, numeric string, or `pt` string.
 * @returns Canonical point string or null for invalid/out-of-range input.
 */
export function normalizeFontSize(value: unknown): string | null {
  const raw = typeof value === "number"
    ? value
    : typeof value === "string" && /^(?:\d+(?:\.\d+)?|\.\d+)(?:pt)?$/iu.test(value.trim())
      ? Number.parseFloat(value)
      : Number.NaN;
  if (!Number.isFinite(raw) || raw < 1 || raw > 300) return null;
  return `${raw}pt`;
}

/**
 * Resolves the next Word-compatible direct font size.
 *
 * @param value - Current effective point size.
 * @param increase - Whether to choose the next larger size.
 * @returns Clamped point size in the 1–300 range.
 */
export function getNextFontSize(value: number, increase: boolean): number {
  const current = Math.min(300, Math.max(1, value));
  if (increase) {
    if (current < 8) return Math.min(8, Math.floor(current + 1));
    if (current >= 72) return Math.min(300, Math.floor(current / 10 + 1) * 10);
    return wordFontSizeSteps.find((size) => size > current) ?? 72;
  }
  if (current <= 8) return Math.max(1, Math.floor(current - 1));
  if (current > 72) return Math.max(72, Math.ceil(current / 10 - 1) * 10);
  return [...wordFontSizeSteps].reverse().find((size) => size < current) ?? 8;
}

/**
 * Reads the direct size at a collapsed selection.
 *
 * @param context - Current command context.
 * @returns Direct size or the first-slice 12 pt fallback.
 */
function readCollapsedFontSize(context: CommandProps): number {
  const markType = context.state.schema.marks.textStyle;
  const marks = context.tr.storedMarks
    ?? context.state.storedMarks
    ?? context.tr.selection.$from.marks();
  const mark = marks.find((candidate) => candidate.type === markType);
  return readPointSize(mark?.attrs.fontSize) ?? 12;
}

/**
 * Reads one canonical point-size value.
 *
 * @param value - Candidate mark attribute.
 * @returns Parsed points or null.
 */
function readPointSize(value: unknown): number | null {
  const normalized = normalizeFontSize(value);
  return normalized === null ? null : Number.parseFloat(normalized);
}
