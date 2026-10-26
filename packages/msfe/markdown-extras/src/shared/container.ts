import type { SourceDocument, SourceNode } from "@quirekit/msfe-core";
import type { PreviewContainer } from "./types";

/** @param document - Canonical source. @param node - Confirmed block syntax. @returns Enclosing container facts for the preview's source line. */
export function previewContainer(document: SourceDocument, node: SourceNode): PreviewContainer {
  let quotes = 0, lists = 0, marker = "";
  const line = document.lineAt(node.from);
  for (let parent = node.parent(); parent; parent = parent.parent()) {
    if (parent.kind === "Blockquote") quotes++;
    if (parent.kind !== "ListItem") continue;
    lists++;
    const mark = parent.child("ListMark");
    if (!marker && mark && mark.from >= line.from && mark.to <= node.from) marker = document.slice(mark.from, mark.to);
  }
  return { quotes, lists, marker };
}

/** @param dom - Retained preview boundary. @param container - Confirmed source ancestry. */
export function presentContainer(dom: HTMLElement, container: PreviewContainer | undefined): void {
  dom.classList.toggle("msfe-quote-line", !!container?.quotes);
  dom.classList.toggle("msfe-preview-block", container !== undefined);
  dom.style.setProperty("--msfe-preview-list-depth", String(container?.lists ?? 0));
  let marker = dom.querySelector<HTMLElement>(":scope > .msfe-preview-list-marker");
  if (!container?.marker) { marker?.remove(); return; }
  if (!marker) { marker = dom.ownerDocument.createElement("span"); dom.prepend(marker); }
  const bullet = /^[-+*]$/u.test(container.marker);
  marker.className = `msfe-preview-list-marker msfe-list-prefix${bullet ? " msfe-list-prefix-hidden" : ""}`;
  marker.textContent = container.marker;
  marker.setAttribute("aria-hidden", "true");
}
