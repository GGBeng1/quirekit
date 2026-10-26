export { projectEditorUIAnchoredOverlayAnchor as projectClassicEditorAnchoredOverlayAnchor } from "@quirekit/editor-ui/vue";

/** Stable selector for the product-owned document overlay host. */
export const classicEditorDocumentOverlaySelector =
  "[data-qk-classic-document-overlays]";

/**
 * Resolves the document-space overlay host exposed to product extensions.
 *
 * @param editorRoot - Mounted Classic Editor product root.
 * @returns The current overlay host, or null before the shell is available.
 */
export function resolveClassicEditorDocumentOverlayHost(
  editorRoot: HTMLElement
): HTMLElement | null {
  return editorRoot.querySelector<HTMLElement>(
    classicEditorDocumentOverlaySelector
  );
}
