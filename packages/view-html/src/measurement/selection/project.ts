import { AllSelection, NodeSelection, TextSelection, type Selection } from "@quirekit/pm";
import { BlockSelection } from "@quirekit/core";
import {
  planQuireStructuredRange, readQuireTableCellSelection,
  QuireStructuredRangeSelection,
  type QuireSelectionStructureIntervalIndex
} from "@quirekit/view-engine";
import type { HtmlDomMeasurementProvider, HtmlMeasuredClientRect } from "../types";

/**
 * Projects existing semantic selections into DOM boxes without filling source gaps.
 * @param selection - Canonical selection produced by shared selection semantics.
 * @param provider - Browser geometry authority for retained content.
 * @param structureIndex - Current document's compiled structure ownership, required for all-selection.
 * @returns Exact cell/owner boxes or browser text rectangles.
 */
export function measureHtmlSelectionRects(
  selection: Selection,
  provider: Pick<HtmlDomMeasurementProvider, "selectionRects" | "nodeSelectionRect" | "nodeDOM">,
  structureIndex?: QuireSelectionStructureIntervalIndex
): readonly HtmlMeasuredClientRect[] {
  if (selection.empty) return [];
  const cellSelection = readQuireTableCellSelection(selection);
  if (cellSelection !== null) {
    return cellSelection.cells.map(cell => provider.nodeSelectionRect(cellSelection.tablePos + cell.originCellPos));
  }
  if (selection instanceof NodeSelection) return [provider.nodeSelectionRect(selection.from)];
  if (selection instanceof BlockSelection) {
    const rects: HtmlMeasuredClientRect[] = [];
    // Direct siblings are the canonical units. Their outer boxes own all paint,
    // including empty bodies and widgets, without reselecting descendant text.
    let from = selection.from;
    for (let index = selection.$from.index(); index < selection.$to.index(); index++) {
      if (provider.nodeDOM(from)) rects.push(provider.nodeSelectionRect(from));
      from += selection.$from.parent.child(index).nodeSize;
    }
    return rects;
  }
  if (selection instanceof TextSelection && structureIndex !== undefined) {
    return measureHtmlTextSelectionRects(selection, provider, structureIndex);
  }
  if (selection instanceof AllSelection && structureIndex === undefined) {
    throw new RangeError("HTML all-selection requires current document structure facts.");
  }
  // Reuse drag projection for paint only. Keep AllSelection authoritative for
  // document-wide commands, and exclude claimed owners from text measurements.
  const segments = selection instanceof QuireStructuredRangeSelection
    ? selection.segments
    : selection instanceof AllSelection
      ? planQuireStructuredRange({ anchor: selection.from, head: selection.to, structureIndex: structureIndex! }).segments
      : undefined;
  if (segments) {
    return segments.flatMap(segment => {
      if (segment.kind === "text") return provider.selectionRects(segment.range);
      const ranges = segment.units.length > 0 ? segment.units.map(unit => unit.range) : [segment.ownerRange];
      return ranges.flatMap(range => provider.nodeDOM(range.from)
        ? [provider.nodeSelectionRect(range.from)]
        : provider.selectionRects(range));
    });
  }
  return selection.ranges.flatMap(range => provider.selectionRects({ from: range.$from.pos, to: range.$to.pos }));
}

/**
 * Fills fully selected owners without expanding canonical text-selection coverage.
 * @param selection - Text range, including body/story-scoped Select All.
 * @param provider - DOM geometry authority for text gaps and complete owners.
 * @param structureIndex - Current snapshot's source-ordered ownership facts.
 * @returns Non-overlapping owner boxes and the remaining text rectangles.
 */
function measureHtmlTextSelectionRects(
  selection: TextSelection,
  provider: Pick<HtmlDomMeasurementProvider, "selectionRects" | "nodeSelectionRect" | "nodeDOM">,
  structureIndex: QuireSelectionStructureIntervalIndex
): readonly HtmlMeasuredClientRect[] {
  const rects: HtmlMeasuredClientRect[] = [];
  let cursor = selection.from;

  // Query existing facts rather than compiling a drag plan: partial entry/exit
  // must stay text, since paint cannot promote the range used by copy or delete.
  for (const owner of structureIndex.query({ from: selection.from, to: selection.to })) {
    const { from, to } = owner.range;
    if (from < cursor || to > selection.to || owner.modes.fullyCrossed !== "owner") continue;
    if (!provider.nodeDOM(from)) continue;
    if (cursor < from) rects.push(...provider.selectionRects({ from: cursor, to: from }));
    rects.push(provider.nodeSelectionRect(from));
    // Outer owners arrive first; advancing past their range suppresses nested
    // boxes and text, so each selected pixel has a single overlay owner.
    cursor = to;
  }
  if (cursor < selection.to) rects.push(...provider.selectionRects({ from: cursor, to: selection.to }));
  return rects;
}
