export { readOverlayViewport } from "@quirekit/editor-ui/vue";

/** @param root - Owning Classic root. @returns Its content viewport, excluding ribbon, ruler and fixed sidebars. */
export function resolveOverlayViewport(root: HTMLElement): HTMLElement {
  return root.querySelector<HTMLElement>(".qk-classic-editor__workspace-viewport") ?? root;
}
