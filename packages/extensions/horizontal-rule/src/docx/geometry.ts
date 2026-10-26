import type { HorizontalRuleAlignment } from "../types";

/**
 * Resolves the indentation needed to realize a percentage width.
 *
 * @param widthPercent - Canonical width percentage.
 * @param sectionBodyWidthDxa - Available section body width.
 * @returns Total horizontal indentation, or undefined without geometry authority.
 */
export function resolveTotalIndent(
  widthPercent: number,
  sectionBodyWidthDxa?: number
): number | undefined {
  if (!isPositiveFinite(sectionBodyWidthDxa)) return undefined;
  return Math.max(0, Math.round(sectionBodyWidthDxa * (1 - widthPercent / 100)));
}

/**
 * Distributes total indentation according to rule alignment.
 *
 * @param total - Total horizontal indentation.
 * @param alignment - Canonical rule alignment.
 * @returns Left and right indentation.
 */
export function distributeIndent(
  total: number | undefined,
  alignment: HorizontalRuleAlignment
): readonly [number, number] {
  if (total === undefined) return [0, 0];
  if (alignment === "left") return [0, total];
  if (alignment === "right") return [total, 0];
  const left = Math.floor(total / 2);
  return [left, total - left];
}

/**
 * Recovers a canonical width percentage from paragraph indents.
 *
 * @param indent - LitAST paragraph indent record.
 * @param sectionBodyWidthDxa - Available section body width.
 * @returns Width percentage when both authorities are usable.
 */
export function resolveWidthPercent(
  indent: Readonly<Record<string, unknown>> | undefined,
  sectionBodyWidthDxa?: number
): number | undefined {
  if (!isPositiveFinite(sectionBodyWidthDxa) || indent === undefined) return undefined;
  const left = readNonNegativeNumber(indent.left) ?? 0;
  const right = readNonNegativeNumber(indent.right) ?? 0;
  return Math.max(
    1,
    Math.min(
      100,
      Math.round(((sectionBodyWidthDxa - left - right) / sectionBodyWidthDxa) * 100)
    )
  );
}

/**
 * Infers alignment from asymmetric paragraph indents.
 *
 * @param indent - LitAST paragraph indent record.
 * @returns Canonical alignment, or undefined without useful indents.
 */
export function resolveIndentAlignment(
  indent: Readonly<Record<string, unknown>> | undefined
): HorizontalRuleAlignment | undefined {
  if (indent === undefined) return undefined;
  const left = readNonNegativeNumber(indent.left) ?? 0;
  const right = readNonNegativeNumber(indent.right) ?? 0;
  if (left === 0 && right > 0) return "left";
  if (right === 0 && left > 0) return "right";
  return left > 0 || right > 0 ? "center" : undefined;
}

/**
 * Checks one optional number for positive finiteness.
 *
 * @param value - Candidate number.
 * @returns Whether the number is a usable geometry authority.
 */
function isPositiveFinite(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Reads a non-negative finite number.
 *
 * @param value - Candidate number.
 * @returns Non-negative number or undefined.
 */
function readNonNegativeNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}
