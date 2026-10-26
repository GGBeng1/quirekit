import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";
import { sourceDocument, sourceNode } from "./authoring/adapter";
import type { SourceDocument, SourceNode } from "./authoring/types";
import type { InlineDestination, SourceDestination } from "./types";
import { decodeMarkdownDestination, decodeMarkdownString } from "../markdown/strings";

/** @param document - Source facade. @param node - Token containing optional continuation markers. @param from - Content start. @param to - Content end. @returns Field text without quote syntax. */
function fieldText(document: SourceDocument, node: SourceNode, from: number, to: number): string {
  let result = "";
  for (const marker of node.children("QuoteMark")) {
    if (marker.from < from || marker.to > to) continue;
    result += document.slice(from, marker.from);
    from = marker.to + Number(document.slice(marker.to, marker.to + 1) === " ");
  }
  return result + document.slice(from, to);
}

/**
 * Reads confirmed inline-destination grammar without interpreting unresolved references.
 * @param state - Canonical source state.
 * @param node - Link or image parser node.
 * @returns Destination offsets, or null for unsupported/ambiguous forms.
 */
export function readInlineDestination(state: EditorState, node: SyntaxNode): InlineDestination | null {
  const destination = readSourceDestination(sourceDocument(state), sourceNode(node));
  return destination?.kind === "inline" ? destination : null;
}

/** @param state - Canonical source facade. @param node - Confirmed syntax. @returns Bounded destination fields. */
export function readSourceDestination(state: SourceDocument, node: SourceNode): SourceDestination | null {
  if (node.kind === "Autolink" || node.kind === "URL") {
    if (node.kind === "URL" && ["Link", "Image", "Autolink", "LinkReference"].includes(node.parentKind ?? "")) return null;
    const token = node.kind === "URL" ? node : node.child("URL");
    if (!token) return null;
    const text = state.slice(token.from, token.to);
    // Automatic link text is not a Markdown string: entities and escapes stay literal.
    const url = /^www\./iu.test(text) ? `http://${text}` : !/^[a-z][a-z0-9+.-]*:/iu.test(text) && text.includes("@") ? `mailto:${text}` : text;
    return { kind: "autolink", labelFrom: token.from, labelTo: token.to, url, title: "" };
  }
  if (node.kind !== "Link" && node.kind !== "Image") return null;
  const marks = node.children("LinkMark");
  const first = marks[0], second = marks[1];
  if (!first || !second) return null;
  // GFM may place a URL token inside the visible label. Only the token after
  // the closing label belongs to this inline destination.
  const url = node.children("URL").find(token => token.from >= second.to);
  if (!url && marks.length < 3) {
    const label = node.child("LinkLabel");
    const reference = label && label.to - label.from > 2 ? fieldText(state, label, label.from + 1, label.to - 1)
      : fieldText(state, node, first.to, second.from);
    const resolved = state.resolveReference(reference);
    return resolved.status === "resolved" ? { kind: "reference", reference, labelFrom: first.to, labelTo: second.from,
      url: resolved.definition.url, title: resolved.definition.title } : null;
  }
  const urlFrom = url?.from ?? marks[2]!.to, urlTo = url?.to ?? urlFrom;
  let destination = url ? fieldText(state, url, urlFrom, urlTo) : "";
  const angled = destination.startsWith("<") && destination.endsWith(">");
  if (angled) destination = destination.slice(1, -1);
  const title = node.child("LinkTitle");
  return { kind: "inline", url: decodeMarkdownDestination(destination), urlFrom: urlFrom + (angled ? 1 : 0), urlTo: urlTo - (angled ? 1 : 0),
    angled, titleFrom: title ? title.from + 1 : null, titleTo: title ? title.to - 1 : null, afterUrl: urlTo, labelFrom: first.to, labelTo: second.from,
    title: title ? decodeMarkdownString(fieldText(state, title, title.from + 1, title.to - 1)) : "" };
}

/**
 * Restricts DOM destinations while leaving unsupported source untouched.
 * @param url - Decoded destination supplied by a feature or host resolver.
 * @param image - Whether the destination is an image resource.
 * @returns Whether the URL is admitted for this rendering context.
 */
export function isSafeDestination(url: string, image = false): boolean {
  if (!url || /[\u0000-\u0020\u007f]/u.test(url)) return false;
  try {
    const parsed = new URL(url, "https://msfe.invalid/");
    return ["https:", "http:", ...(image ? ["blob:"] : ["mailto:"])].includes(parsed.protocol)
      || (image && /^data:image\/(png|jpeg|gif|webp);base64,/iu.test(url));
  } catch { return false; }
}
