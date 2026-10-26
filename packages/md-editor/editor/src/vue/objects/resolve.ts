import type { EditorView } from "@quirekit/cm-view";
import type { MsfeEditor, MsfeSourceRange, SourceMatch } from "@quirekit/msfe-core";
import { svgImageUrl } from "./svg";
import { dataViewPreview, type DataViewEmbed } from "@quirekit/data-view";
import type { MdObjectFacts, MdObjectHit, MdObjectKind, MdObjectRaster } from "./types";

/** Component roots that select as objects: diagram figures, block previews and image controls. */
export const mdObjectSelector = "[data-qk-data-view],[data-qk-mind-map],[data-qk-flowchart],[data-qk-whiteboard],[data-md-object],"
  + "[data-msfe-preview=mermaid],[data-msfe-preview=textDiagram],[data-msfe-preview=displayMath]";

/** Block preview kinds mapped to their semantic source names. */
const previews: Readonly<Record<string, MdObjectKind>> = { mermaid: "mermaid", textDiagram: "textDiagram", displayMath: "math" };

/** Display names for text diagram grammars. */
const grammars: Readonly<Record<string, string>> = { plantuml: "PlantUML", dot: "DOT", mermaid: "Mermaid" };

/** Source attribute holding each diagram's portable envelope. */
const envelopes = { mindMap: "mind", flowchart: "flow", whiteboard: "board" } as const;

/** @param element - Candidate component root. @returns Its object kind, or null for ordinary content. */
export function mdObjectKind(element: HTMLElement): MdObjectKind | null {
  if (element.dataset.qkDataView) return "dataView";
  if (element.dataset.qkMindMap) return "mindMap";
  if (element.dataset.qkFlowchart) return "flowchart";
  if (element.dataset.qkWhiteboard) return "whiteboard";
  if (element.dataset.msfePreview) return previews[element.dataset.msfePreview] ?? null;
  return element.dataset.mdObject === "image" ? "image" : null;
}

/**
 * Block previews replace from their line start, so container prefixes such as `> ` precede the match.
 * @param editor - Canonical source owner.
 * @param kind - Installed semantic feature.
 * @param position - Source position at the component's start.
 * @returns The confirmed match covering that position or starting on its line, if parsing has settled.
 */
function matchAt(editor: MsfeEditor, kind: MdObjectKind, position: number): SourceMatch | null {
  const line = editor.state.doc.lineAt(position), to = Math.min(Math.max(line.to, position + 1), editor.state.doc.length);
  const matches = editor.querySource(kind, { from: position, to }).matches;
  return matches.find(match => match.from <= position && position < match.to)
    ?? matches.find(match => match.from >= position && match.from <= line.to) ?? null;
}

/**
 * Maps a clicked component root back to the exact source it renders.
 * @param view - Mounted CodeMirror view owning the widget.
 * @param editor - Canonical source owner.
 * @param element - Component root matched by {@link mdObjectSelector}.
 * @returns Feature and source range, or null for detached or unconfirmed widgets.
 */
export function resolveMdObject(view: EditorView, editor: MsfeEditor, element: HTMLElement): MdObjectHit | null {
  const kind = mdObjectKind(element);
  if (!kind || !view.contentDOM.contains(element)) return null;
  let position: number;
  try { position = view.posAtDOM(element); } catch { return null; }
  const match = matchAt(editor, kind, position);
  return match ? { kind, range: { from: match.from, to: match.to } } : null;
}

/**
 * Reads display facts from canonical source rather than from the mounted preview.
 * @param editor - Canonical source owner.
 * @param kind - Selected feature.
 * @param range - Current mapped object range.
 * @param element - Mounted root, used only for the resolved image resource address.
 * @returns Title and preview source, or null when the object no longer parses.
 */
export function readMdObjectFacts(editor: MsfeEditor, kind: MdObjectKind, range: MsfeSourceRange, element: HTMLElement | null): MdObjectFacts | null {
  const match = editor.querySource(kind, range).matches.find(item => item.from === range.from && item.to === range.to);
  if (!match) return null;
  if (kind === "dataView") {
    const preview = dataViewPreview(match.attrs.dataView as DataViewEmbed);
    return { title: preview.title, alt: preview.notice, src: null, paper: false, format: "svg" };
  }
  if (kind === "image") {
    const image = element?.querySelector("img");
    return { title: String(match.attrs.title ?? ""), alt: String(match.attrs.alt ?? ""),
      src: image?.currentSrc || image?.src || String(match.attrs.url ?? "") || null, paper: false, format: "png" };
  }
  // KaTeX output is HTML with web fonts, not an image, so formulas never preview or download.
  if (kind === "math") return { title: "", alt: String(match.attrs.text ?? ""), src: null, paper: false, format: "svg" };
  if (kind === "mermaid" || kind === "textDiagram") {
    const name = grammars[String(match.attrs.language ?? "mermaid")] ?? "", image = element?.querySelector("img"), svg = element?.querySelector("svg");
    return { title: name, alt: name, src: image?.src || (svg ? svgImageUrl(svg) : null), paper: true, format: "svg" };
  }
  const envelope = match.attrs[envelopes[kind]] as { readonly title?: string; readonly preview?: MdObjectRaster | null } | undefined;
  return { title: envelope?.title ?? "", alt: envelope?.title ?? "", src: envelope?.preview?.url ?? envelope?.preview?.dataUrl ?? null, paper: true, format: "png" };
}

/**
 * Text diagram and formula previews sit inside the code block surface that draws their border;
 * the selection frame follows that surface when it holds only this object.
 * @param root - Selected component root.
 * @returns The visible surface to outline.
 */
export function mdObjectFrame(root: HTMLElement): HTMLElement {
  if (root.dataset.qkDataView === "inline") return root;
  const surface = root.parentElement?.closest<HTMLElement>(".qk-code-block");
  return surface && surface.querySelectorAll(mdObjectSelector).length === 1 ? surface : root;
}

/** @param title - Object name. @param format - Image format. @returns A file name safe on common file systems. */
export function mdObjectFileName(title: string, format: MdObjectFacts["format"]): string {
  return `${title.trim().replace(/[\\/:*?"<>|]/gu, "_") || "image"}.${format}`;
}

