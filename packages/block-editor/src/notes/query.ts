import type { Node } from "@quirekit/pm";
import type { BlockNote, NoteOccurrence } from "./types";
const cache = new WeakMap<Node, readonly BlockNote[]>();
/** @param doc - Immutable canonical source. @returns Association and numbering reused for selection-only updates. */
export function readNotes(doc: Node): readonly BlockNote[] {
  const previous = cache.get(doc); if (previous) return previous;
  const notes = new Map<string, { id: string; number: number; references: NoteOccurrence[]; definitions: NoteOccurrence[] }>();
  let number = 0;
  doc.descendants((node, from) => {
    const reference = node.type.name === "footnoteReference", definition = node.type.name === "footnoteDefinition";
    if (!reference && !definition) return true;
    const id = String(node.attrs.noteId ?? "");
    let note = notes.get(id);
    if (!note) { note = { id, number: 0, references: [], definitions: [] }; notes.set(id, note); }
    if (reference && !note.number) note.number = ++number;
    note[reference ? "references" : "definitions"].push({ from, to: from + node.nodeSize, node });
    return !reference;
  });
  const result = [...notes.values()].sort((a, b) => (a.number || Infinity) - (b.number || Infinity));
  cache.set(doc, result); return result;
}
