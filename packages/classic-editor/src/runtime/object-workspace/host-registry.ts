import type { ClassicEditorInstance } from "../../types";
import type {
  ClassicEditorObjectWorkspaceContribution,
  ClassicEditorObjectWorkspaceController
} from "../../types/object-workspace";

/** Exact-instance registry for the one mounted object workspace per editor. */
export class ClassicEditorObjectWorkspaceHostRegistry {
  private readonly controllers = new WeakMap<
    ClassicEditorInstance,
    ClassicEditorObjectWorkspaceController
  >();

  /**
   * Registers the unique object controller mounted for one product instance.
   *
   * @param instance - Exact Classic product instance.
   * @param controller - Root-local shared object controller.
   * @returns Idempotent cleanup for this exact registration.
   */
  register(
    instance: ClassicEditorInstance,
    controller: ClassicEditorObjectWorkspaceController
  ): () => void {
    const current = this.controllers.get(instance);
    if (current !== undefined && current !== controller) {
      throw new RangeError("A Classic editor instance cannot mount two object workspaces.");
    }
    this.controllers.set(instance, controller);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      if (this.controllers.get(instance) === controller) {
        this.controllers.delete(instance);
      }
    };
  }

  /**
   * Activates one feature-owned exact object contribution in its owning root.
   *
   * @param instance - Exact Classic product instance.
   * @param contribution - Retained feature contribution to project.
   * @returns Whether the instance has a mounted host and accepted the contribution.
   */
  activate(
    instance: ClassicEditorInstance,
    contribution: ClassicEditorObjectWorkspaceContribution
  ): boolean {
    return this.controllers.get(instance)?.activate(contribution) ?? false;
  }

  /**
   * Clears the active object only from its exact product instance.
   *
   * @param instance - Exact Classic product instance.
   * @param reason - Presentation-only close reason.
   * @returns Whether one mounted controller changed.
   */
  clear(
    instance: ClassicEditorInstance,
    reason: "selection" | "stale" | "unmount" | "explicit" = "explicit"
  ): boolean {
    return this.controllers.get(instance)?.clear(reason) ?? false;
  }

  /**
   * Reads the one shared controller mounted for an exact product instance.
   *
   * Feature-owned chrome may use this to project a second WPS-evidenced trigger
   * from the same retained target and action catalog. It must never construct a
   * parallel controller or retain the returned value beyond the mounted root.
   *
   * @param instance - Exact Classic product instance.
   * @returns Mounted shared controller, or null before/after its lifecycle.
   */
  read(
    instance: ClassicEditorInstance
  ): ClassicEditorObjectWorkspaceController | null {
    return this.controllers.get(instance) ?? null;
  }

  /** @param instance - Exact product instance. @returns Whether its host is mounted. */
  has(instance: ClassicEditorInstance): boolean {
    return this.controllers.has(instance);
  }
}

/** Shared registry whose WeakMap keys preserve product-root isolation. */
export const classicEditorObjectWorkspaceHosts =
  new ClassicEditorObjectWorkspaceHostRegistry();
