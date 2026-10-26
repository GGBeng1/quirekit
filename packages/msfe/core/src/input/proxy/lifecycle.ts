import type { EditorView } from "@quirekit/cm-view";
import { sourceInputOwners } from "./focus";

/**
 * Preserves extension focus hooks when the native input host is outside rendered CM content.
 * @param view - Mounted source owner.
 * @param focus - Installed focus hook, absent when unsubscribed.
 * @param blur - Installed blur hook, absent when unsubscribed.
 * @returns Complete native listener disposer.
 */
export function observeSourceInputFocus(view: EditorView, focus: ((event: FocusEvent) => void) | undefined,
  blur: ((event: FocusEvent) => void) | undefined): () => void {
  const doc = view.dom.ownerDocument;
  /** @param event - Original native focus event; other inputs and editors remain independent. */
  function change(event: FocusEvent): void {
    const owner = sourceInputOwners.get(view);
    if (!owner?.active || event.target !== owner.input) return;
    if (event.type === "focus") focus?.(event); else blur?.(event);
  }
  doc.addEventListener("focus", change, true); doc.addEventListener("blur", change, true);
  return () => { doc.removeEventListener("focus", change, true); doc.removeEventListener("blur", change, true); };
}
