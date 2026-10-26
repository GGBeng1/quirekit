import type {
  ClassicEditorWorkspacePanelContribution,
  ClassicEditorWorkspacePanelController
} from "../../types/workspace-panel";
import {
  assertWorkspacePanelContribution,
  onceWorkspacePanelCleanup
} from "./validation";

/** Callback invoked after one exact contribution leaves the registry. */
export type ClassicEditorWorkspacePanelContributionRemoved = (
  contribution: ClassicEditorWorkspacePanelContribution
) => void;

/** Instance-local typed contribution registry with connection cleanup ownership. */
export class ClassicEditorWorkspacePanelContributionRegistry {
  private readonly contributions = new Map<string, ClassicEditorWorkspacePanelContribution>();
  private readonly cleanups = new Map<ClassicEditorWorkspacePanelContribution, () => void>();

  /**
   * Creates one registry bound to the owning panel controller.
   *
   * @param controller - Typed controller supplied to plugin trigger connections.
   * @param onRemoved - Stack cleanup invoked after an exact registration leaves.
   */
  constructor(
    private readonly controller: ClassicEditorWorkspacePanelController,
    private readonly onRemoved: ClassicEditorWorkspacePanelContributionRemoved
  ) {}

  /**
   * Registers one exact direct contribution object.
   *
   * @param contribution - Typed plugin contribution.
   * @returns Idempotent unregister callback.
   */
  register(contribution: ClassicEditorWorkspacePanelContribution): () => void {
    assertWorkspacePanelContribution(contribution);
    const registered = this.contributions.get(contribution.id);
    if (registered !== undefined && registered !== contribution) {
      throw new RangeError(
        `Classic Editor Workspace Panel contribution ids must be unique: ${contribution.id}`
      );
    }
    if (registered === contribution) return () => undefined;
    this.contributions.set(contribution.id, contribution);
    let cleanup: (() => void) | void;
    try {
      cleanup = contribution.connect?.(this.controller);
    } catch (error) {
      this.contributions.delete(contribution.id);
      throw error;
    }
    if (typeof cleanup === "function") {
      this.cleanups.set(contribution, onceWorkspacePanelCleanup(cleanup));
    }
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.unregister(contribution);
    };
  }

  /**
   * Reports whether one exact direct contribution is registered.
   *
   * @param contribution - Direct contribution object from an open request.
   * @returns Whether the exact object remains registered under its id.
   */
  has(contribution: ClassicEditorWorkspacePanelContribution): boolean {
    return this.contributions.get(contribution.id) === contribution;
  }

  /** Releases all plugin trigger connections without stack callbacks. */
  destroy(): void {
    for (const cleanup of this.cleanups.values()) cleanup();
    this.cleanups.clear();
    this.contributions.clear();
  }

  /**
   * Removes one exact registration and notifies the owning stack.
   *
   * @param contribution - Exact registered contribution.
   */
  private unregister(contribution: ClassicEditorWorkspacePanelContribution): void {
    if (!this.has(contribution)) return;
    this.cleanups.get(contribution)?.();
    this.cleanups.delete(contribution);
    this.contributions.delete(contribution.id);
    this.onRemoved(contribution);
  }
}
