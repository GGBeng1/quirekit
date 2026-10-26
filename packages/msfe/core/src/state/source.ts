import type { Text } from "@quirekit/cm-state";
import type { MarkdownInput, SourceFormat } from "./types";

/**
 * Accepts homogeneous text without silently losing file formatting.
 * @param source - Decoded Markdown supplied by the host.
 * @returns Logical text and the retained file-format policy.
 */
export function readMarkdownInput(source: string): MarkdownInput {
  const bom = source.startsWith("\ufeff");
  const text = bom ? source.slice(1) : source;
  if (/\r(?!\n)/u.test(text)) throw new Error("unsupported-line-ending: bare CR");
  const crlf = text.includes("\r\n");
  if (crlf && /(^|[^\r])\n/u.test(text)) throw new Error("mixed-line-endings: expected uniform LF or CRLF");
  return { text: text.replaceAll("\r\n", "\n"), bom, lineEnding: crlf ? "\r\n" : "\n" };
}

/**
 * Serializes only at an explicit host read/save boundary.
 * @param doc - Canonical CodeMirror text.
 * @param format - Retained formatting of this document.
 * @returns Markdown with the original homogeneous separator and BOM.
 */
export function writeMarkdown(doc: Text, format: SourceFormat): string {
  return (format.bom ? "\ufeff" : "") + doc.sliceString(0, doc.length, format.lineEnding);
}
