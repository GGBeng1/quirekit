import type { MdOutlinePosition } from "../types";

/** Outline column widths: the pinned panel, and the collapsed toggle. */
const OUTLINE = { side: 240, toggle: 40 } as const;
/** Comment card column width. */
const COMMENTS = 280;
/** Space between columns and at the editor edges. */
const GAP = 24;

/** Rails beside the document column in the document layout. */
export interface MdRailInput {
  /** Whether block handles need room before the document. */
  readonly blockControls: boolean;
  /** Outline presentation. */
  readonly outline: "none" | "side" | "toggle";
  /** Side of the document the outline sits on. */
  readonly outlinePosition: MdOutlinePosition;
  /** Whether the comment rail is shown. */
  readonly comments: boolean;
  /** Sticky toolbar height, the top of the rails. */
  readonly toolbarHeight: number;
}

/**
 * Reserves the minimum room on each side of an independently centered document. The outline stays at
 * the editor edge while comments sit beside the text, with block handles kept clear of both rails.
 * @param input - Rails to place.
 * @returns Root CSS variables, or undefined when no rail is shown.
 */
export function railStyle(input: MdRailInput): Record<string, string> | undefined {
  if (input.outline === "none" && !input.comments) return undefined;
  const gutter = input.blockControls ? 88 : GAP, outline = input.outline === "none" ? 0 : OUTLINE[input.outline];
  const atStart = input.outline !== "none" && input.outlinePosition === "start";
  const comments = input.comments ? COMMENTS + GAP : 0;
  const start = gutter + (atStart ? outline + GAP : 0), end = GAP + comments + (input.outline !== "none" && !atStart ? outline + GAP : 0);
  return {
    "--md-editor-rail-start": `${start}px`, "--md-editor-rail-end": `${end}px`, "--md-editor-block-gutter": `${gutter}px`,
    "--md-editor-outline-width": `${outline}px`, "--md-editor-comment-width": `${COMMENTS}px`, "--md-editor-comment-reserve": `${comments}px`,
    "--md-editor-toolbar-height": `${input.toolbarHeight}px`,
  };
}
