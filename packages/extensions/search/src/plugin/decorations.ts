import {
  Decoration,
  DecorationGroup,
  DecorationSet,
  type DecorationSource,
  type Node as PMNode,
  type Transaction
} from "@quirekit/pm";
import type { TextblockRange } from "../match/scan";
import type { SearchHighlightStyle, SearchMatch } from "../types";

/** Decoration spec key shared by every match highlight. */
const searchMatchKey = "quirekit-search-match";

/**
 * Creates the transient highlight for one match.
 *
 * @param match - Match range.
 * @param style - Highlight colors.
 * @returns Inline decoration.
 */
function createMatchDecoration(match: SearchMatch, style: SearchHighlightStyle): Decoration {
  return Decoration.inline(
    match.from,
    match.to,
    { class: "qk-search-match", style: `background-color: ${style.match}` },
    { key: searchMatchKey }
  );
}

/**
 * Builds the highlight set for a complete match list.
 *
 * @param doc - Document owning the matches.
 * @param matches - Every match.
 * @param style - Highlight colors.
 * @returns Decoration set.
 */
export function buildSearchDecorations(
  doc: PMNode,
  matches: readonly SearchMatch[],
  style: SearchHighlightStyle
): DecorationSet {
  if (matches.length === 0) return DecorationSet.empty;
  return DecorationSet.create(doc, matches.map((match) => createMatchDecoration(match, style)));
}

/**
 * Maps the highlight set and replaces decorations only inside rescanned textblocks.
 *
 * @param decorations - Highlights in the old document.
 * @param tr - Document-changing transaction.
 * @param rescanned - Textblocks rescanned in the new document.
 * @param added - Matches found inside `rescanned`.
 * @param style - Highlight colors.
 * @returns Highlights in the new document.
 */
export function updateSearchDecorations(
  decorations: DecorationSet,
  tr: Transaction,
  rescanned: readonly TextblockRange[],
  added: readonly SearchMatch[],
  style: SearchHighlightStyle
): DecorationSet {
  let next = decorations.map(tr.mapping, tr.doc);
  const stale = rescanned.flatMap((block) => next.find(block.from, block.to));
  if (stale.length > 0) next = next.remove(stale);
  if (added.length > 0) {
    next = next.add(tr.doc, added.map((match) => createMatchDecoration(match, style)));
  }
  return next;
}

/**
 * Combines match highlights with the active-match highlight.
 *
 * The active match is also the editor selection, so its ordinary highlight is
 * removed: stacking that fill under the selection tint muddies the glyphs. The
 * outline keeps the match identifiable while focus stays in the search panel.
 *
 * @param doc - Current document.
 * @param decorations - Highlights for every match.
 * @param active - Active match, if any.
 * @param style - Highlight colors.
 * @returns Decoration source for the view prop.
 */
export function composeSearchDecorations(
  doc: PMNode,
  decorations: DecorationSet,
  active: SearchMatch | null,
  style: SearchHighlightStyle
): DecorationSource {
  if (active === null) return decorations;
  const underneath = decorations.find(active.from, active.to)
    .filter((decoration) => decoration.from === active.from && decoration.to === active.to);
  const activeSet = DecorationSet.create(doc, [Decoration.inline(active.from, active.to, {
    class: "qk-search-match-active",
    style: [
      ...(style.active === "transparent" ? [] : [`background-color: ${style.active}`]),
      `outline-color: ${style.activeOutline}`,
      "outline-width: 2px",
      "outline-style: solid"
    ].join("; ")
  })]);
  return DecorationGroup.from([decorations.remove(underneath), activeSet]);
}
