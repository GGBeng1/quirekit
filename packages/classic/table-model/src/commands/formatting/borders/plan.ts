import type { WordTableGridRect } from "../../../map";
import type { WordTableBorders } from "../../../types";
import type { WordTableCellBorderFormat } from "../../types";
import { isVisibleBorder, readBorderFormatCandidate } from "./candidates";
import { borderEdgeSegments, borderSegmentKey, borderSegmentOwners } from "./segments";
import { writeSemanticBorderEdge } from "./source";
import { resolvePresetEdges } from "./topology";
import { equalBorders, patchBorder } from "./patch";
import type { BorderFormatPatch, BorderFormatSource, BorderGridSegment } from "./types";

/**
 * Plans a property edit without adding hidden or absent edges.
 * @param source - Immutable table/map authority.
 * @param rect - Valid merged-cell-closed selection.
 * @param format - Valid normalized property patch.
 * @returns Complete pending tuples, or null for unrepresentable partial long edges.
 */
export function planBorderFormat(source: BorderFormatSource, rect: WordTableGridRect, format: WordTableCellBorderFormat): Map<string, WordTableBorders> | null {
  const segments = new Map<string, BorderGridSegment>();
  for (const cell of source.map.cellsInRect(rect)) {
    for (const edge of resolvePresetEdges(cell, rect, "all")) {
      for (const segment of borderEdgeSegments(cell, edge)) segments.set(borderSegmentKey(segment), segment);
    }
  }

  // Resolve source authority before promoting inherited edges to direct attrs.
  // Both equal-tier visible owners participate; hidden/weaker owners stay intact.
  const patches = new Map<string, BorderFormatPatch>();
  for (const segment of segments.values()) {
    const candidates = borderSegmentOwners(source.map, segment).flatMap(([cell, edge]) => {
      const candidate = readBorderFormatCandidate(source, cell, edge, segment);
      return candidate ? [candidate] : [];
    });
    const priority = Math.max(...candidates.map(candidate => candidate.priority));
    for (const candidate of candidates) {
      if (candidate.priority !== priority || !isVisibleBorder(candidate.border)) continue;
      const key = `${candidate.cell.id}:${candidate.edge}`;
      const patch = patches.get(key);
      const border = patchBorder(candidate.border, format);
      const changed = !equalBorders(candidate.border, border);
      if (patch) {
        patch.offsets.add(segment.offset);
        patch.uniform &&= equalBorders(patch.border, border);
        patch.changed ||= changed;
      } else patches.set(key, { candidate, border, offsets: new Set([segment.offset]), uniform: true, changed });
    }
  }

  // One tcBorders side cannot encode multiple subsegments. Reject atomically
  // instead of editing unselected portions or flattening unrequested properties.
  const pending = new Map<string, WordTableBorders>();
  for (const patch of patches.values()) {
    const { cell, edge } = patch.candidate;
    const span = edge === "top" || edge === "bottom" ? cell.rect.columnSpan : cell.rect.rowSpan;
    if (!patch.uniform || patch.offsets.size !== span) return null;
    if (!patch.changed) continue;
    writeSemanticBorderEdge(pending, source.table, source.map, cell, edge, patch.border);
  }
  return pending;
}
