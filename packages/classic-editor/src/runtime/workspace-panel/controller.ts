import type {
  ClassicEditorWorkspacePanelCloseReason, ClassicEditorWorkspacePanelContribution,
  ClassicEditorWorkspacePanelController, ClassicEditorWorkspacePanelEntry,
  ClassicEditorWorkspacePanelFreshness, ClassicEditorWorkspacePanelFocusTarget,
  ClassicEditorWorkspacePanelListener, ClassicEditorWorkspacePanelRequest,
  ClassicEditorWorkspacePanelSnapshot, ClassicEditorWorkspacePanelTarget
} from "../../types/workspace-panel";
import { restoreClassicPrimitiveFocus } from "../../ui/primitives/focus";
import { freezeWorkspacePanelEntry } from "./freeze";
import { ClassicEditorWorkspacePanelContributionRegistry } from "./registry";
import { ClassicEditorWorkspacePanelSnapshotChannel } from "./snapshot-channel";
import { removeWorkspacePanelContributionEntries, updateWorkspacePanelStackFreshness } from "./transitions";
import { assertWorkspacePanelFreshness, assertWorkspacePanelTarget } from "./validation";

/** Instance-scoped runtime for the one shared Workspace Panel slot. */
export class ClassicEditorWorkspacePanelHostRuntime
implements ClassicEditorWorkspacePanelController {
  private readonly registry = new ClassicEditorWorkspacePanelContributionRegistry(
    this,
    (contribution) => this.handleContributionRemoved(contribution)
  );
  private readonly channel = new ClassicEditorWorkspacePanelSnapshotChannel();
  private focusSurface: ClassicEditorWorkspacePanelFocusTarget | null = null;
  private occurrence = 0;
  private destroyed = false;
  /** @returns Current immutable instance-local panel state. */
  get snapshot(): ClassicEditorWorkspacePanelSnapshot {
    return this.channel.snapshot;
  }

  /** @inheritdoc */
  subscribe(listener: ClassicEditorWorkspacePanelListener): () => void {
    this.assertActive();
    return this.channel.subscribe(listener);
  }

  /** @inheritdoc */
  register(contribution: ClassicEditorWorkspacePanelContribution): () => void {
    this.assertActive();
    return this.registry.register(contribution);
  }

  /** @inheritdoc */
  open(request: ClassicEditorWorkspacePanelRequest): boolean {
    return this.replace(request);
  }

  /** @inheritdoc */
  replace(request: ClassicEditorWorkspacePanelRequest): boolean {
    this.assertActive();
    const prepared = this.prepareEntry(request);
    if (prepared === null) return false;
    const returnFocus = prepared.returnFocus ?? this.snapshot.stack[0]?.returnFocus ?? null;
    this.channel.publish(
      [freezeWorkspacePanelEntry({ ...prepared, returnFocus })],
      this.snapshot.active === null ? null : "replace"
    );
    return true;
  }

  /** @inheritdoc */
  push(request: ClassicEditorWorkspacePanelRequest): boolean {
    this.assertActive();
    if (this.snapshot.active === null) return this.open(request);
    const prepared = this.prepareEntry(request);
    if (prepared === null) return false;
    this.channel.publish([...this.snapshot.stack, prepared], null);
    return true;
  }

  /** @inheritdoc */
  back(): boolean {
    this.assertActive();
    if (!this.snapshot.canBack) return false;
    this.channel.publish(this.snapshot.stack.slice(0, -1), null);
    this.focus();
    return true;
  }

  /** @inheritdoc */
  close(reason: ClassicEditorWorkspacePanelCloseReason = "explicit"): boolean {
    this.assertActive();
    if (this.snapshot.active === null) return false;
    const returnFocus = this.snapshot.stack[0]?.returnFocus ?? null;
    this.channel.publish([], reason);
    restoreClassicPrimitiveFocus(returnFocus);
    return true;
  }

  /** @inheritdoc */
  setPinned(pinned: boolean): boolean {
    this.assertActive();
    const active = this.snapshot.active;
    if (active === null || active.pinned === pinned) return false;
    const stack = this.snapshot.stack.slice(0, -1);
    stack.push(freezeWorkspacePanelEntry({ ...active, pinned }));
    this.channel.publish(stack, null);
    return true;
  }

  /** @inheritdoc */
  focus(): boolean {
    this.assertActive();
    return restoreClassicPrimitiveFocus(this.focusSurface);
  }

  /** @inheritdoc */
  updateFreshness(
    target: ClassicEditorWorkspacePanelTarget,
    freshness: ClassicEditorWorkspacePanelFreshness
  ): boolean {
    this.assertActive();
    assertWorkspacePanelTarget(target);
    assertWorkspacePanelFreshness(freshness);
    const stack = updateWorkspacePanelStackFreshness(
      this.snapshot.stack,
      target,
      freshness
    );
    if (stack === null) return false;
    this.channel.publish(stack, null);
    return true;
  }

  /**
   * Binds the root-local focus surface without installing document listeners.
   *
   * @param target - Mounted host surface, or null during unmount.
   */
  bindFocusSurface(target: ClassicEditorWorkspacePanelFocusTarget | null): void {
    if (this.destroyed) return;
    this.focusSurface = target;
  }

  /**
   * Closes the stack, releases plugin connections, and removes all listeners.
   *
   * @param reason - Unmount or final instance-destroy reason.
   */
  destroy(
    reason: Extract<ClassicEditorWorkspacePanelCloseReason, "unmount" | "destroy"> = "destroy"
  ): void {
    if (this.destroyed) return;
    this.destroyed = true;
    const returnFocus = this.snapshot.stack[0]?.returnFocus ?? null;
    this.channel.destroy(reason);
    this.registry.destroy();
    this.focusSurface = null;
    restoreClassicPrimitiveFocus(returnFocus);
  }

  /**
   * Validates and copies one request after confirming direct object registration.
   *
   * @param request - Candidate open or push request.
   * @returns Frozen entry, or null for an unregistered contribution object.
   */
  private prepareEntry(
    request: ClassicEditorWorkspacePanelRequest
  ): ClassicEditorWorkspacePanelEntry | null {
    assertWorkspacePanelTarget(request.target);
    assertWorkspacePanelFreshness(request.freshness);
    if (!this.registry.has(request.contribution)) {
      return null;
    }
    this.occurrence += 1;
    return freezeWorkspacePanelEntry({
      entryId: `workspace-panel-${this.occurrence}`,
      contribution: request.contribution,
      target: request.target,
      freshness: request.freshness,
      pinned: false,
      returnFocus: request.returnFocus
    });
  }

  /**
   * Removes one exact registration and any occurrences it owns.
   *
   * @param contribution - Exact registered object.
   */
  private handleContributionRemoved(
    contribution: ClassicEditorWorkspacePanelContribution
  ): void {
    const previous = this.snapshot.stack;
    const stack = removeWorkspacePanelContributionEntries(previous, contribution);
    if (stack === null) return;
    const returnFocus = previous[0]?.returnFocus ?? null;
    this.channel.publish(stack, stack.length === 0 ? "contribution-removed" : null);
    if (stack.length === 0) restoreClassicPrimitiveFocus(returnFocus);
    else this.focus();
  }

  /** Throws when callers retain a destroyed controller. */
  private assertActive(): void {
    if (this.destroyed) {
      throw new Error("Classic Editor Workspace Panel host has been destroyed.");
    }
  }
}
