import { syncMountedInputProxyImePreeditVisibility } from "@quirekit/view/mounted-backend";
import type { HtmlMountedViewElements } from "../types";

/**
 * Establishes required HTML mount geometry without a consumer stylesheet.
 *
 * @param elements - Owned surfaces before insertion into the host document.
 */
export function applyHtmlMountedStructureStyles(elements: HtmlMountedViewElements): void {
  // Range boxes are projected relative to the content surface. Its overlays
  // must share that origin instead of finding an unrelated positioned ancestor.
  Object.assign(elements.root.style, { position: "relative", display: "block" });
  Object.assign(elements.contentSurface.style, {
    position: "relative", display: "block", overflow: "visible"
  });
  for (const overlay of [elements.overlaySurface, elements.overlayHost]) {
    Object.assign(overlay.style, {
      position: "absolute", inset: "0", width: "100%", height: "100%",
      pointerEvents: "none", overflow: "visible"
    });
  }

  // The keyboard/IME host never participates in content flow. The existing
  // input adapter still owns its live dimensions and candidate-window anchor.
  Object.assign(elements.inputProxy.style, {
    position: "absolute", top: "0", left: "0", pointerEvents: "none", zIndex: "2"
  });
  syncMountedInputProxyImePreeditVisibility({ inputProxy: elements.inputProxy });
}
