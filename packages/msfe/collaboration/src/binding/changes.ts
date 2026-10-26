import type { ChangeSet, ChangeSpec } from "@quirekit/cm-state";
import type { Text, YTextEvent } from "yjs";

/** @param text - Shared text before the accepted local transaction. @param changes - Simultaneous original-coordinate changes. */
export function writeChanges(text: Text, changes: ChangeSet): void {
  if (changes.length !== text.length) throw new Error("collaboration-source-length");
  const edits: { from: number; to: number; insert: string }[] = [];
  changes.iterChanges((from, to, _nextFrom, _nextTo, insert) => edits.push({ from, to, insert: insert.toString() }));
  if (edits.some(edit => edit.insert.includes("\r"))) throw new Error("collaboration-source-format");
  // Descending source offsets preserve the original coordinates of every earlier range.
  for (const edit of edits.reverse()) {
    if (edit.to > edit.from) text.delete(edit.from, edit.to - edit.from);
    if (edit.insert) text.insert(edit.from, edit.insert);
  }
}

/** @param event - CRDT source delta. @returns Original-coordinate CM changes without serializing the whole source. */
export function readChanges(event: YTextEvent): ChangeSpec[] {
  if (event.keysChanged.size) throw new Error("collaboration-source-format");
  const changes: ChangeSpec[] = [];
  let position = 0;
  for (const part of event.delta) {
    if (part.attributes || (part.insert !== undefined && (typeof part.insert !== "string" || part.insert.includes("\r")))) {
      throw new Error("collaboration-source-format");
    }
    if (part.retain) position += part.retain;
    if (part.delete) { changes.push({ from: position, to: position + part.delete }); position += part.delete; }
    if (typeof part.insert === "string") changes.push({ from: position, insert: part.insert });
  }
  return changes;
}
