import { EditorSelection } from "@quirekit/cm-state";
import { createAbsolutePositionFromRelativePosition, createRelativePositionFromTypeIndex, type Text } from "yjs";
import type { RelativeSelection } from "./types";

/** @param text - Canonical shared source. @param selection - Local directed ranges. @returns Stable CRDT-relative coordinates. */
export function relativeSelection(text: Text, selection: EditorSelection): RelativeSelection {
  return { mainIndex: selection.mainIndex, ranges: selection.ranges.map(range => ({
    anchor: createRelativePositionFromTypeIndex(text, range.anchor, range.assoc),
    head: createRelativePositionFromTypeIndex(text, range.head, range.assoc), assoc: range.assoc,
  })) };
}

/** @param text - Current shared source. @param selection - Captured relative ranges. @returns Mapped local selection or undefined. */
export function resolveSelection(text: Text, selection: RelativeSelection | undefined): EditorSelection | undefined {
  if (!selection || !text.doc) return undefined;
  const ranges = selection.ranges.map(range => {
    const anchor = createAbsolutePositionFromRelativePosition(range.anchor, text.doc!);
    const head = createAbsolutePositionFromRelativePosition(range.head, text.doc!);
    const from = anchor?.type === text ? anchor.index : 0, to = head?.type === text ? head.index : from;
    return EditorSelection.range(Math.min(from, text.length), Math.min(to, text.length), undefined, undefined, range.assoc);
  });
  return ranges.length ? EditorSelection.create(ranges, selection.mainIndex) : undefined;
}
