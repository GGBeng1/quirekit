import type { PreviewOutputCache, PreviewProps } from "../shared/types";

const documents = new WeakMap<Document, Map<string, string>>();
const maxEntries = 32, maxBytes = 2 * 1024 * 1024;

/** @param props - Renderer family and exact source body. @returns A key only for source-font PlantUML/DOT output, never host-font Mermaid. */
function key(props: PreviewProps): string | undefined {
  return props.kind === "textDiagram" && (props.language === "plantuml" || props.language === "dot") ? JSON.stringify([props.language, props.text]) : undefined;
}

/** @param entries - Bounded owner-local outputs. @returns Conservative key/HTML UTF-16 text bytes, without retaining DOM or editor objects. */
function bytes(entries: Map<string, string>): number {
  let size = 0;
  for (const [identity, html] of entries) size += (identity.length + html.length) * 2;
  return size;
}

/** Successful sanitized diagrams shared across remounts/readers in one document, with exact-source admission and bounded LRU storage. */
export const textDiagramPreviewCache: PreviewOutputCache = {
  /** @param props - Exact source body. @param owner - Mounted document. @returns Accepted output if available, promoting it to most recently used. */
  get(props, owner) {
    const identity = key(props), entries = documents.get(owner);
    if (identity === undefined || !entries) return undefined;
    const html = entries.get(identity);
    if (html !== undefined) { entries.delete(identity); entries.set(identity, html); }
    return html;
  },
  /** @param props - Completed request body. @param owner - Mounted document. @param html - Sanitized successful output, never source/error text. */
  set(props, owner, html) {
    const identity = key(props);
    if (identity === undefined) return;
    const entries = documents.get(owner) ?? new Map<string, string>();
    entries.delete(identity);
    if ((identity.length + html.length) * 2 > maxBytes) return;
    entries.set(identity, html);
    // At most 32 entries participate in eviction; source input and selection
    // updates do no scanning, and oversized diagrams remain renderable uncached.
    while (entries.size > maxEntries || bytes(entries) > maxBytes) entries.delete(entries.keys().next().value!);
    documents.set(owner, entries);
  },
};
