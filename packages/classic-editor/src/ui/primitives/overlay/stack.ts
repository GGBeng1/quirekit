import type { ClassicPrimitiveOverlayCloseReason, ClassicPrimitiveOverlayIsolationTarget, ClassicPrimitiveOverlayRegistration } from "./types";
import {
  activeOverlayIds, entriesForRoot, findOverlayEntry,
  overlayBranchContainsTarget,
  rootForOverlayTarget, topOverlayAcrossRoots, topOverlayEntry,
  type ClassicPrimitiveOverlayEntry
} from "./stack/entries";
import { createOverlayModalIsolationReconciler } from "./stack/isolation";
import { closeOverlayBranch, removeOverlayBranch } from "./stack/lifecycle";
import { freezeOverlayRegistration } from "./stack/registration";

/**
 * Command-neutral, root-local lifecycle stack for menus, popovers and dialogs.
 * It intentionally owns neither rendered DOM nor editor selection mutation.
 */
export class ClassicPrimitiveOverlayStack {
  private readonly entriesByRoot = new Map<object, Map<string, ClassicPrimitiveOverlayEntry>>();
  private readonly isolationByRoot = new Map<
    object,
    Map<ClassicPrimitiveOverlayIsolationTarget, { readonly inert: boolean; readonly ariaHidden: string | null }>
  >();
  private nextSequence = 0;
  private readonly reconcileModalIsolation = createOverlayModalIsolationReconciler(
    this.entriesByRoot,
    this.isolationByRoot
  );

  /**
   * Opens one controlled overlay and replaces only its sibling branch.
   *
   * @param registration - Immutable owner, parent, close and policy facts.
   * @returns Nothing.
   */
  open(registration: ClassicPrimitiveOverlayRegistration): void {
    const frozen = freezeOverlayRegistration(registration);
    this.replaceExistingIdentity(frozen.id);
    let entries = entriesForRoot(this.entriesByRoot, frozen.root);
    if (frozen.parentId !== undefined && !entries.has(frozen.parentId)) {
      throw new Error(`Overlay parent \"${registration.parentId}\" is not active in its root.`);
    }

    for (const entry of [...entries.values()]) {
      if (entry.registration.parentId === frozen.parentId) {
        closeOverlayBranch(
          this.entriesByRoot,
          frozen.root,
          entry.registration.id,
          "replaced",
          false,
          this.reconcileModalIsolation
        );
      }
    }
    entries = entriesForRoot(this.entriesByRoot, frozen.root);
    entries.set(frozen.id, {
      registration: frozen,
      sequence: ++this.nextSequence,
      depth: frozen.parentId === undefined
        ? 0
        : (entries.get(frozen.parentId)?.depth ?? -1) + 1
    });
    this.reconcileModalIsolation(frozen.root);
  }

  /**
   * Returns active ids in visual stack order for one root or all roots.
   *
   * @param root - Optional root to inspect.
   * @returns Stable low-to-high stack identities.
   */
  activeIds(root?: object): readonly string[] {
    return activeOverlayIds(this.entriesByRoot, root);
  }

  /**
   * Closes a controlled overlay and its descendants.
   *
   * @param id - Stable overlay identity.
   * @param reason - Explicit lifecycle reason.
   * @returns Whether a matching overlay was closed.
   */
  close(id: string, reason: ClassicPrimitiveOverlayCloseReason): boolean {
    const found = findOverlayEntry(this.entriesByRoot, id);
    if (found === undefined) return false;
    closeOverlayBranch(
      this.entriesByRoot,
      found.root,
      id,
      reason,
      reason !== "replaced",
      this.reconcileModalIsolation
    );
    return true;
  }

  /**
   * Removes one overlay identity without asking its controlled owner to close.
   * This is the compatibility projection used after a Vue controlled prop changed.
   *
   * @param id - Stable overlay identity.
   * @returns Nothing.
   */
  release(id: string): void {
    const found = findOverlayEntry(this.entriesByRoot, id);
    if (found === undefined) return;
    if (removeOverlayBranch(this.entriesByRoot, found.root, id)) {
      this.reconcileModalIsolation(found.root);
    }
  }

  /**
   * Dismisses only the topmost eligible branch in one root for an outside pointer.
   *
   * @param root - Root whose floating UI received the document event.
   * @param target - Captured event target.
   * @returns Nothing.
   */
  dismissOutside(root: object, target: EventTarget | null): void {
    const top = topOverlayEntry(this.entriesByRoot.get(root));
    if (top === undefined || overlayBranchContainsTarget(this.entriesByRoot.get(root), top.registration.id, target)) return;
    if (top.registration.dismissOnOutsidePointer?.() === false) return;
    this.close(top.registration.id, "outside-pointer");
  }

  /**
   * Applies outside-pointer dismissal independently to every root.
   *
   * @param target - Captured document event target.
   * @returns Nothing.
   */
  dismissOutsideAll(target: EventTarget | null): void {
    for (const root of [...this.entriesByRoot.keys()]) this.dismissOutside(root, target);
  }

  /**
   * Dismisses the topmost eligible overlay in one root on Escape.
   *
   * @param root - Root that currently owns keyboard focus.
   * @returns Nothing.
   */
  dismissEscape(root: object): void {
    const top = topOverlayEntry(this.entriesByRoot.get(root));
    if (top === undefined || top.registration.dismissOnEscape?.() === false) return;
    this.close(top.registration.id, "escape");
  }

  /**
   * Dismisses only the visually topmost overlay across independent roots on Escape.
   *
   * @returns Nothing.
   */
  dismissEscapeTopmost(): void {
    const top = topOverlayAcrossRoots(this.entriesByRoot);
    if (top !== undefined) this.dismissEscape(top.root);
  }

  /**
   * Closes every overlay in one root during mounted-view destruction.
   *
   * @param root - Root being unmounted.
   * @returns Nothing.
   */
  destroyRoot(root: object): void {
    const roots = this.entriesByRoot.get(root);
    if (roots === undefined) return;
    for (const id of [...roots.keys()]) this.close(id, "destroy");
  }

  /**
   * Resolves a root only through explicit registration target ownership.
   *
   * @param target - Focused browser event target.
   * @returns Owning editor root, when one active registration matches.
   */
  resolveRootForTarget(target: EventTarget | null): object | undefined {
    return rootForOverlayTarget(this.entriesByRoot, target);
  }

  /**
   * Removes an identity from a previous root before it is opened elsewhere.
   *
   * @param id - Moving identity.
   * @returns Nothing.
   */
  private replaceExistingIdentity(id: string): void {
    const found = findOverlayEntry(this.entriesByRoot, id);
    if (found === undefined) return;
    closeOverlayBranch(
      this.entriesByRoot,
      found.root,
      id,
      "replaced",
      false,
      this.reconcileModalIsolation
    );
  }
}
