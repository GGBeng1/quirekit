/** Stable id for the retained HTML native-selection suppression stylesheet. */
const selectionStyleId = "qk-html-selection-presentation";
/** Documents that already own the scoped presentation stylesheet. */
const styledDocuments = new WeakSet<Document>();

/**
 * Installs transparent native caret and selection paint for retained HTML.
 *
 * Browser Selection remains mirrored for accessibility, clipboard, and platform
 * semantics, but custom measured rectangles are the only visible authority.
 *
 * @param ownerDocument - Browser document receiving the scoped stylesheet.
 */
export function ensureHtmlSelectionPresentationStyle(ownerDocument: Document): void {
  if (styledDocuments.has(ownerDocument)) {
    return;
  }
  const style = ownerDocument.createElement("style");
  style.setAttribute("id", selectionStyleId);
  style.textContent = [
    ".qk-html-editor__document{caret-color:transparent}",
    ".qk-html-editor__document :is(h1,h2,h3,h4,h5,h6){font-family:var(--qk-document-heading-font-family,inherit)}",
    ".qk-html-editor__document ::selection{background:transparent;color:inherit}",
    ".qk-html-editor[data-qk-hidden-text-view='normal'] [data-qk-hidden-text='true']{display:none}",
    ".qk-html-editor[data-qk-hidden-text-view='formatting-inspection'] [data-qk-hidden-text='true']{text-decoration-line:underline;text-decoration-style:dotted;text-decoration-color:rgba(124,58,237,.58);text-underline-offset:.14em}"
  ].join("");
  (ownerDocument.head ?? ownerDocument.documentElement).appendChild(style);
  styledDocuments.add(ownerDocument);
}
