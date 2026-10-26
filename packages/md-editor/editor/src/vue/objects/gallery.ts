import type { EditorView } from "@quirekit/cm-view";
import type { MsfeEditor, MsfeSourceRange } from "@quirekit/msfe-core";
import { mdObjectSelector, readMdObjectFacts, resolveMdObject } from "./resolve";
import { pendingImageUrl, svgMarkupImageUrl } from "./svg";
import type { MdObjectGallery, MdObjectGalleryItem, MdObjectKind, MdPendingDiagram } from "./types";

/** Kinds collected into one preview gallery; formulas are HTML, not images, and stay out. */
const galleryKinds: readonly MdObjectKind[] = ["image", "mindMap", "flowchart", "whiteboard", "mermaid", "textDiagram"];

/**
 * Builds the preview gallery from every previewable object, in document order.
 * Runs only when a preview opens. Mounted components contribute their resolved image or
 * rendered SVG; text diagrams outside the viewport get a placeholder and a pending render.
 * @param view - Mounted view, for resolved resources.
 * @param editor - Canonical source owner.
 * @param range - Object that opened the preview.
 * @param pending - Placeholder label for diagrams that still need rendering.
 * @returns Gallery items, the opening index and the diagrams left to render.
 */
export function collectMdObjectGallery(view: EditorView, editor: MsfeEditor, range: MsfeSourceRange, pending: string): MdObjectGallery {
  const mounted = new Map<number, string>();
  for (const root of view.contentDOM.querySelectorAll<HTMLElement>(mdObjectSelector)) {
    const hit = resolveMdObject(view, editor, root);
    if (!hit || hit.kind === "math") continue;
    const src = readMdObjectFacts(editor, hit.kind, hit.range, root)?.src;
    if (src) mounted.set(hit.range.from, src);
  }
  const all = { from: 0, to: editor.state.doc.length };
  const entries: { from: number; item: MdObjectGalleryItem; render?: Omit<MdPendingDiagram, "id"> }[] = [];
  for (const kind of galleryKinds) {
    for (const match of editor.querySource(kind, all).matches) {
      const facts = readMdObjectFacts(editor, kind, match, null);
      if (!facts) continue;
      const src = mounted.get(match.from) ?? facts.src;
      const text = kind === "mermaid" || kind === "textDiagram" ? String(match.attrs.text ?? "") : "";
      // Only source-rendered diagrams can be produced later; other objects need an address now.
      if (!src && !text) continue;
      const item = { id: `${kind}:${match.from}`, src: src ?? pendingImageUrl(pending), alt: facts.alt,
        ...(facts.title ? { title: facts.title } : {}), ...(facts.paper ? { background: "#fff" } : {}) };
      entries.push({ from: match.from, item, ...(!src ? { render: { language: String(match.attrs.language ?? "mermaid"), text } } : {}) });
    }
  }
  entries.sort((a, b) => a.from - b.from);
  return { items: entries.map(entry => entry.item), index: Math.max(0, entries.findIndex(entry => entry.from === range.from)),
    pending: entries.flatMap(entry => entry.render ? [{ id: entry.item.id, ...entry.render }] : []) };
}

/**
 * Renders the gallery's unmounted text diagrams one at a time with the shared engine.
 * @param view - Mounted view, for owner document and typography.
 * @param pending - Diagrams still showing a placeholder.
 * @param signal - Aborted when the gallery closes.
 * @param ready - Receives each finished image address.
 */
export async function renderMdGalleryDiagrams(view: EditorView, pending: readonly MdPendingDiagram[], signal: AbortSignal, ready: (id: string, src: string) => void): Promise<void> {
  if (!pending.length) return;
  const { renderTextDiagram } = await import("@quirekit/text-diagram/browser");
  const owner = view.dom.ownerDocument, style = owner.defaultView!.getComputedStyle(view.contentDOM);
  const typography = { fontFamily: style.fontFamily, fontSize: Number.parseFloat(style.fontSize) };
  for (const diagram of pending) {
    if (signal.aborted) return;
    try {
      const { svg } = await renderTextDiagram(diagram.language as Parameters<typeof renderTextDiagram>[0], diagram.text, { signal, typography, ownerDocument: owner });
      const src = !signal.aborted && svgMarkupImageUrl(owner, svg);
      if (src) ready(diagram.id, src);
    } catch { if (signal.aborted) return; }
  }
}
