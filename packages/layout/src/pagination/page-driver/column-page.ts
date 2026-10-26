import type { QuireRect } from "@quirekit/renderer";
import type { QuirePageGeometry } from "../geometry";
import {
  balanceQuireColumnPage,
  createQuireColumnSeparators,
  paginateQuireColumnPage,
  type QuireColumnPageOptions,
  type QuireColumnPageResult
} from "./columns";

/** Column page result with the separators the page draws. */
export interface QuireDrivenColumnPageResult extends QuireColumnPageResult {
  /** Separator lines for the accepted columns; empty when separators are off. */
  readonly separators: readonly QuireRect[];
  /** Page-bottom edge of the note areas when they sit below a balanced band. */
  readonly noteAreaBottom?: number | undefined;
}

/**
 * Fills one multi-column page and applies the template's balance and separator policy.
 *
 * Only the page that exhausts the container is balanced, so a section ending
 * above a following continuous section leaves level columns behind it.
 *
 * @param options - Column page inputs at full column height.
 * @param template - Page geometry template carrying the column policy.
 * @returns Page result with separators, or null when a column requested backtracking.
 */
export function paginateQuireBalancedColumnPage(
  options: QuireColumnPageOptions,
  template: QuirePageGeometry
): QuireDrivenColumnPageResult | null {
  const fitted = paginateQuireColumnPage(options);
  if (fitted === null) {
    return null;
  }
  const fullHeight = options.geometry.columnRects[0]!.height;
  const balancing = fitted.kind === "done" && template.balanceLastPageColumns === true;
  const balanced = !balancing
    ? { result: fitted, height: fullHeight }
    : hasQuireColumnNotes(fitted)
      ? balanceQuireColumnPage({ ...options, notesBelowFlow: true }, fitted,
          (candidate, height) => height + readQuireColumnNoteReserve(candidate) <= fullHeight)
      : balanceQuireColumnPage(options, fitted);
  // Balanced body text leaves the notes of the page at the page bottom, as the
  // following continuous section fills the space between them.
  const notesBelow = balanced.result !== fitted && hasQuireColumnNotes(balanced.result);
  return {
    ...balanced.result,
    separators: template.columns?.separator === true
      ? createQuireColumnSeparators(options.geometry.columnRects, balanced.result.columns, balanced.height)
      : [],
    ...(notesBelow ? { noteAreaBottom: options.geometry.columnRects[0]!.y + fullHeight } : {})
  };
}

/**
 * Checks whether any accepted column places notes.
 *
 * @param result - Column page result.
 * @returns Whether a column carries notes.
 */
function hasQuireColumnNotes(result: QuireColumnPageResult): boolean {
  return result.columns.some((column) => column.notes !== undefined);
}

/**
 * Reads the height the page bottom must keep for the columns' note areas.
 *
 * @param result - Column page result whose notes sit below the flow.
 * @returns Tallest column note area.
 */
function readQuireColumnNoteReserve(result: QuireColumnPageResult): number {
  return Math.max(0, ...result.columns.map((column) => column.noteAreaHeight ?? 0));
}
