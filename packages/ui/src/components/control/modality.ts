/** Keys that move focus and therefore switch the document to keyboard modality. */
const navigationKeys = new Set([
  "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown", "F6"
]);

/** Documents whose modality listeners are already installed. */
const trackedDocuments = new WeakSet<Document>();

/**
 * Records the most recent input modality on `<html data-qk-modality>`.
 *
 * The keyboard focus ring reads this attribute so that focus returned programmatically after a
 * pointer interaction (closing a menu, popover or dialog) does not show a ring, even when the
 * browser reports `:focus-visible`. Installation is idempotent per document.
 *
 * @param ownerDocument - Document whose root receives the modality attribute.
 */
export function trackQuireKitInputModality(ownerDocument: Document): void {
  if (trackedDocuments.has(ownerDocument)) return;
  trackedDocuments.add(ownerDocument);
  const root = ownerDocument.documentElement;
  const apply = (modality: "keyboard" | "pointer"): void => {
    if (root.dataset.qkModality !== modality) root.dataset.qkModality = modality;
  };
  // Lazy installation (first popup mount) happens after the opening input; infer it from the still-focused trigger.
  if (root.dataset.qkModality === undefined && ownerDocument.activeElement !== ownerDocument.body) {
    apply(ownerDocument.activeElement?.matches(":focus-visible") ? "keyboard" : "pointer");
  }
  ownerDocument.addEventListener("pointerdown", () => apply("pointer"), { capture: true, passive: true });
  ownerDocument.addEventListener("keydown", (event) => {
    if (navigationKeys.has(event.key) && !event.metaKey && !event.ctrlKey) apply("keyboard");
  }, { capture: true, passive: true });
}
