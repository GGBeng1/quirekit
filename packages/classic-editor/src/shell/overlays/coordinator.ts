import { ClassicPrimitiveOverlayStack } from "../../ui/primitives/overlay/stack";
import type { ClassicPrimitiveOverlayCloseReason } from "../../ui/primitives/overlay/types";

/** Compatibility projection for one floating surface registered with the canonical stack. */
export interface ClassicEditorOverlayRegistration {
  /** Stable identity shared by the trigger and teleported content. */
  readonly id: string;
  /** Classic root that owns exclusivity, or undefined for legacy document scope. */
  readonly root: object | undefined;
  /** Closes the controlled component without dispatching editor commands. */
  readonly close: () => void;
  /** Reports whether a captured pointer outside may dismiss this surface. */
  readonly dismissOnOutsidePointer?: (() => boolean) | undefined;
  /** Parent surface identity when this controlled surface is a submenu or child popover. */
  readonly parentId?: string | undefined;
  /** Explicit visual layer within the root-local stack. */
  readonly layerPriority?: number | undefined;
  /** Returns focus through an existing trigger or logical-selection policy. */
  readonly restoreFocus?: (() => void) | undefined;
  /** Reports whether Escape may dismiss the controlled surface. */
  readonly dismissOnEscape?: (() => boolean) | undefined;
}

/**
 * Coordinates active floating surfaces without coupling ownership to DOM
 * ancestry. One surface is active per Classic root, while legacy callers that
 * provide no root retain one shared fallback scope.
 */
export class ClassicEditorOverlayCoordinator {
  private readonly fallbackRoot = {};
  private readonly stack = new ClassicPrimitiveOverlayStack();

  /** @returns Active overlay ids in registration order for diagnostics. */
  get activeIds(): readonly string[] {
    return this.stack.activeIds();
  }

  /**
   * Activates one surface and closes only the previous surface in the same root.
   *
   * @param registration - Surface identity, root ownership, and close callback.
   * @returns Whether opening this identity replaced another surface in its root.
   */
  activate(registration: ClassicEditorOverlayRegistration): boolean {
    const root = registration.root ?? this.fallbackRoot;
    const previousIds = this.stack.activeIds();
    this.stack.open({
      id: registration.id,
      root,
      owner: "legacy",
      parentId: registration.parentId,
      layerPriority: registration.layerPriority,
      close: (reason) => this.closeRegistration(registration, reason),
      containsTarget: (target) => belongsToRegistration(registration, target),
      restoreFocus: registration.restoreFocus,
      dismissOnOutsidePointer: registration.dismissOnOutsidePointer,
      dismissOnEscape: registration.dismissOnEscape
    });
    const currentIds = this.stack.activeIds();
    return previousIds.some(id => id !== registration.id && !currentIds.includes(id));
  }

  /**
   * Releases one active surface regardless of whether its root has remounted.
   *
   * @param id - Stable overlay identity.
   */
  release(id: string): void {
    this.stack.release(id);
  }

  /**
   * Closes every active surface whose teleported owner does not contain the
   * captured pointer target.
   *
   * @param belongsToTarget - Reports whether the pointer target belongs to an id.
   */
  dismissOutside(belongsToTarget: (id: string) => boolean): void {
    this.stack.dismissOutsideAll({ belongsToTarget } as unknown as EventTarget);
  }

  /**
   * Dismisses Escape in the root explicitly owning the focused target.
   *
   * @param belongsToTarget - Optional compatibility target ownership predicate.
   * @returns Nothing.
   */
  dismissEscape(belongsToTarget?: (id: string) => boolean): void {
    if (belongsToTarget === undefined) {
      this.stack.dismissEscapeTopmost();
      return;
    }
    const target = { belongsToTarget } as unknown as EventTarget;
    const root = this.stack.resolveRootForTarget(target);
    if (root !== undefined) this.stack.dismissEscape(root);
    else this.stack.dismissEscapeTopmost();
  }

  /**
   * Preserves the legacy no-argument close callback while discarding lifecycle detail.
   *
   * @param registration - Compatibility surface to close.
   * @param _reason - Canonical lifecycle reason retained by the primitive stack.
   * @returns Nothing.
   */
  private closeRegistration(
    registration: ClassicEditorOverlayRegistration,
    _reason: ClassicPrimitiveOverlayCloseReason
  ): void {
    registration.close();
  }
}

/**
 * Tests a captured compatibility target without inventing a second target registry.
 *
 * @param registration - Compatibility registration containing its target predicate.
 * @param target - Synthetic target supplied by the compatibility caller.
 * @returns Whether the active registration owns the target.
 */
function belongsToRegistration(
  registration: ClassicEditorOverlayRegistration,
  target: EventTarget | null
): boolean {
  const candidate = target as { readonly belongsToTarget?: unknown } | null;
  return typeof candidate?.belongsToTarget === "function"
    && candidate.belongsToTarget(registration.id) === true;
}
