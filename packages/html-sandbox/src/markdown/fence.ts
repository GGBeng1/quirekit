import type { HtmlSandboxFence } from "./types";
/** Read only explicit html-preview fences; upstream completion is a separate signal.
 * @param text - Exact fenced source slice. @returns Recognized source or null.
 */
export function readHtmlSandboxFence(text: string): HtmlSandboxFence | null {
  const opening = /^( {0,3})(`{3,}|~{3,})html-preview[ \t]*\r?\n/.exec(text);
  if (!opening) return null;
  const body = text.slice(opening[0].length);
  const fence = opening[2]!;
  const closing = new RegExp(`^ {0,3}${fence[0]}{${fence.length},}[ \t]*(?:\r?\n)?$`, "m");
  const match = closing.exec(body);
  if (!match) return { html: body, closed: false };
  if (body.slice(match.index + match[0].length).trim()) return null;
  return { html: body.slice(0, match.index).replace(/\r?\n$/, ""), closed: true };
}
/** Serialize source as an unambiguous fence. The closing delimiter owns one separator newline; source newlines are retained.
 * @param html - Original HTML. @returns Safe portable Markdown.
 */
export function writeHtmlSandboxFence(html: string): string {
  let width = 3;
  for (const match of html.matchAll(/`+/g)) width = Math.max(width, match[0].length + 1);
  const fence = "`".repeat(width);
  const separator = html.includes("\r\n") && !/(^|[^\r])\n/.test(html) ? "\r\n" : "\n";
  return `${fence}html-preview${separator}${html}${separator}${fence}`;
}
