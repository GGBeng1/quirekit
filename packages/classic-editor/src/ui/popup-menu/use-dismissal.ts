import { watch } from "vue";
import type { ClassicEditorPopupDismissalSources } from "./types";

/**
 * Preserves contextual-card focus and child-first dismissal without owning geometry.
 * @param sources - Current root, target and child-overlay ownership.
 */
export function usePopupDismissal(sources: ClassicEditorPopupDismissalSources): void {
  watch([sources.visible, sources.root], ([visible, root], _previous, onCleanup) => {
    if (!visible) return;
    const doc = root.ownerDocument;
    let active = true;
    /** @param event - Input whose original target is captured before descendants can unmount. */
    function handleOutside(event: Event): void {
      const target = event.target;
      const ElementConstructor = doc.defaultView?.Element;
      if (!ElementConstructor || !(target instanceof ElementConstructor)
        || belongsToPopup(target, root, sources.ownerId)) return;
      // View can claim a document pointer and replace the semantic target before
      // dismissal runs. Focus returning to the input proxy is never an outside edit.
      const inRoot = root.contains(target);
      const inDocument = inRoot && target.closest(".qk-classic-editor__canvas-mount") !== null;
      if (event.type === "focusin" && inRoot && target.matches("[data-qk-input-proxy]")) return;
      queueMicrotask(() => {
        if (!active || !sources.visible()) return;
        if (event.type === "pointerdown" && event.defaultPrevented && inDocument && sources.hasTarget()) return;
        sources.close();
      });
    }
    /** @param event - Escape after nested public controls have had a chance to consume it. */
    function handleEscape(event: KeyboardEvent): void {
      if (event.key !== "Escape" || event.isComposing || sources.hasChild()) return;
      const target = event.target;
      const NodeConstructor = doc.defaultView?.Node;
      if (!NodeConstructor || !(target instanceof NodeConstructor) || !root.contains(target)) return;
      queueMicrotask(() => {
        if (!active || event.defaultPrevented || !sources.visible()) return;
        sources.close();
        sources.restoreFocus();
      });
    }
    doc.addEventListener("pointerdown", handleOutside, true);
    doc.addEventListener("focusin", handleOutside, true);
    doc.addEventListener("keydown", handleEscape);
    onCleanup(() => {
      active = false;
      doc.removeEventListener("pointerdown", handleOutside, true);
      doc.removeEventListener("focusin", handleOutside, true);
      doc.removeEventListener("keydown", handleEscape);
    });
  }, { immediate: true, flush: "post" });
}

/**
 * Follows public ARIA ownership to recognize body-portalled pickers and submenus.
 * @param target - Original event target.
 * @param root - Owning product root.
 * @param ownerId - Card's stable overlay identity.
 * @returns Whether the card or one of its controlled descendants owns the event.
 */
function belongsToPopup(target: Element, root: HTMLElement, ownerId: string): boolean {
  if (target.closest(`[data-qk-classic-overlay="${ownerId}"]`)) return true;
  const pending = [...root.querySelectorAll(`[data-qk-classic-overlay="${ownerId}"]`)];
  const visited = new Set<Element>();
  while (pending.length) {
    const surface = pending.pop()!;
    if (visited.has(surface)) continue;
    visited.add(surface);
    if (surface.contains(target)) return true;
    for (const trigger of surface.querySelectorAll("[aria-controls], [aria-owns]")) {
      const ids = `${trigger.getAttribute("aria-controls") ?? ""} ${trigger.getAttribute("aria-owns") ?? ""}`;
      for (const id of ids.split(/\s+/u).filter(Boolean)) {
        const controlled = root.ownerDocument.getElementById(id);
        if (controlled) pending.push(controlled);
      }
    }
  }
  return false;
}
