import type { SourceEdit } from "@quirekit/msfe-core";
import type { DocumentPropertiesData, DocumentPropertyChange, DocumentPropertyValue } from "./types";

/** @param value - Requested scalar/list. @returns Safe JSON-compatible YAML with explicit string quoting, or null. */
function encode(value: DocumentPropertyValue): string | null {
  const values = Array.isArray(value) ? value : [value];
  if (!values.every(item => item === null || typeof item === "string" || typeof item === "boolean" || typeof item === "number" && Number.isFinite(item))) return null;
  return JSON.stringify(value);
}

/** @param key - Requested decoded key. @returns Whether it can identify a visible, nonempty property. */
function validKey(key: string): boolean { return !!key.trim() && !/[\u0000-\u001f\u007f]/u.test(key); }

/**
 * Plans a local property edit while preserving all unrelated source and comments.
 * @param source - Current canonical prefix; it must still match the captured header.
 * @param expected - Snapshot that produced the user's control.
 * @param change - Explicit property intent.
 * @returns Local source edits, or null for stale/unsupported input.
 */
export function planDocumentProperty(source: string, expected: DocumentPropertiesData, change: DocumentPropertyChange): readonly SourceEdit[] | null {
  if (!source.startsWith(expected.source) || !validKey(change.key)
    || /[^\r\n]/u.test(source.slice(expected.source.length, expected.source.length + 1))) return null;
  const entry = expected.entries.find(item => item.key === change.key);
  if (change.type === "add") {
    const value = encode(change.value);
    if (entry || value === null) return null;
    const key = JSON.stringify(change.key);
    return [{ from: expected.insertAt, insert: `${key}: ${value}${expected.newline}` }];
  }
  if (!entry || !entry.editable) return null;
  if (change.type === "rename") {
    if (!validKey(change.name) || expected.entries.some(item => item.key === change.name && item !== entry)) return null;
    return [{ from: entry.keyFrom, to: entry.keyTo, insert: JSON.stringify(change.name) }];
  }
  if (change.type === "remove") return [{ from: entry.keyFrom, to: entry.valueTo, insert: "" }];
  const value = encode(change.value);
  if (value === null) return null;
  const empty = entry.valueFrom === entry.valueTo, trailingLine = /\r?\n$/u.test(entry.source);
  return [{ from: entry.valueFrom, to: entry.valueTo, insert: (empty ? " " : "") + value + (trailingLine ? expected.newline : "") }];
}
