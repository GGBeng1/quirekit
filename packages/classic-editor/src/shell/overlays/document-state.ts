import { ClassicEditorOverlayCoordinator } from "./coordinator";

/** DOM attribute shared by an overlay trigger and its teleported content. */
export const classicEditorOverlayOwnerAttribute = "data-qk-classic-overlay";

/** Mutable overlay state owned by one browser document. */
export interface ClassicEditorOverlayDocumentState {
  /** Root-scoped floating-surface ownership for this browser document. */
  readonly coordinator: ClassicEditorOverlayCoordinator;
  /** Browser document whose capture listeners this state owns. */
  readonly ownerDocument: Document;
  /** Capture-phase pointer listener retained for exact cleanup. */
  readonly handlePointerDown: (event: PointerEvent) => void;
  /** Capture-phase keyboard listener retained for exact cleanup. */
  readonly handleKeyDown: (event: KeyboardEvent) => void;
}

const overlayStates = new WeakMap<Document, ClassicEditorOverlayDocumentState>();

/**
 * Resolves the singleton coordinator for one browser document.
 *
 * @param ownerDocument - Browser document that receives capture-phase events.
 * @returns Stable document-level overlay state.
 */
export function resolveClassicEditorOverlayState(
  ownerDocument: Document
): ClassicEditorOverlayDocumentState {
  const existing = overlayStates.get(ownerDocument);
  if (existing !== undefined) return existing;
  const coordinator = new ClassicEditorOverlayCoordinator();
  const handlePointerDown = (event: PointerEvent): void => {
    coordinator.dismissOutside((id) => (
      targetBelongsToOverlay(event.target, id, ownerDocument)
    ));
  };
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    coordinator.dismissEscape((id) => (
      targetBelongsToOverlay(event.target, id, ownerDocument)
    ));
  };
  const state: ClassicEditorOverlayDocumentState = {
    coordinator,
    ownerDocument,
    handlePointerDown,
    handleKeyDown
  };
  ownerDocument.addEventListener("pointerdown", handlePointerDown, true);
  ownerDocument.addEventListener("keydown", handleKeyDown, true);
  overlayStates.set(ownerDocument, state);
  return state;
}

/**
 * Removes idle document listeners after controlled replacement transitions settle.
 *
 * @param state - Document state whose canonical stack may now be idle.
 * @returns Nothing.
 */
export function releaseIdleClassicEditorOverlayState(
  state: ClassicEditorOverlayDocumentState
): void {
  queueMicrotask(() => {
    if (state.coordinator.activeIds.length > 0) return;
    state.ownerDocument.removeEventListener(
      "pointerdown",
      state.handlePointerDown,
      true
    );
    state.ownerDocument.removeEventListener("keydown", state.handleKeyDown, true);
    overlayStates.delete(state.ownerDocument);
  });
}

/**
 * Reports whether an event target belongs to the active overlay.
 *
 * @param target - Captured browser event target.
 * @param overlayId - Active overlay identity.
 * @param ownerDocument - Document whose Element constructor owns the target.
 * @returns Whether the target is inside this overlay's trigger or content.
 */
function targetBelongsToOverlay(
  target: EventTarget | null,
  overlayId: string,
  ownerDocument: Document
): boolean {
  const ElementConstructor = ownerDocument.defaultView?.Element;
  if (
    ElementConstructor === undefined
    || !(target instanceof ElementConstructor)
  ) return false;
  // A child trigger carries its own identity before its popup is registered.
  // Its enclosing Toolbar still owns that pointer; only checking the nearest
  // marker would dismiss the parent before the child could open.
  let owner = target.closest(`[${classicEditorOverlayOwnerAttribute}]`);
  while (owner !== null) {
    if (owner.getAttribute(classicEditorOverlayOwnerAttribute) === overlayId) return true;
    owner = owner.parentElement?.closest(`[${classicEditorOverlayOwnerAttribute}]`) ?? null;
  }
  return false;
}
