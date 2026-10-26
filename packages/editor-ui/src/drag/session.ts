import {
  hasExceededEditorUIDragThreshold,
  resolveEditorUIDragThreshold
} from "./threshold";
import { isValidEditorUIDragSourceSelection } from "./intent";
import { resolveEditorUIDragDrop } from "./drop";
import { normalizeEditorUIDragTarget } from "./target";
import { DragSessionTransientOwner } from "./transients";
import { resolveEditorUIDragSourceRemap } from "./source-remap";
import type {
  EditorUIDragArmInput,
  EditorUIDragArmResult,
  EditorUIDragCancelReason,
  EditorUIDragDropResult,
  EditorUIDragRemapResult,
  EditorUIDragSessionPorts,
  EditorUIDragSessionState,
  EditorUIDragSourceRemapInput,
  EditorUIDragUpdateInput,
  EditorUIDragUpdateResult
} from "./types";

/** Command-neutral drag state machine with one complete transient lifecycle. */
export class DragSession<SourcePayload, TargetPayload> {
  private readonly ports: EditorUIDragSessionPorts<SourcePayload, TargetPayload>;
  private readonly threshold: number;
  private readonly transients: DragSessionTransientOwner<SourcePayload, TargetPayload>;
  private pressPoint: EditorUIDragArmInput<SourcePayload>["pressClientPoint"] | undefined;
  private stateValue: EditorUIDragSessionState<SourcePayload, TargetPayload> = { phase: "idle" };

  /**
   * Creates one command-neutral drag session.
   *
   * @param ports - Target, lock, indicator, and auto-scroll ports.
   */
  constructor(ports: EditorUIDragSessionPorts<SourcePayload, TargetPayload>) {
    this.ports = ports;
    this.threshold = resolveEditorUIDragThreshold(ports.threshold);
    this.transients = new DragSessionTransientOwner(ports);
  }

  /** Current immutable public session state. */
  get state(): EditorUIDragSessionState<SourcePayload, TargetPayload> {
    return this.stateValue;
  }

  /**
   * Arms one stable structural source and acquires its preview lock.
   *
   * @param input - Pointer, press point, source selection, and opaque payload.
   * @returns Armed state or explicit rejection.
   */
  arm(input: EditorUIDragArmInput<SourcePayload>): EditorUIDragArmResult {
    if (this.stateValue.phase !== "idle") return { status: "rejected", reason: "already-active" };
    if (!isValidEditorUIDragSourceSelection(input.source.selection)) {
      return { status: "rejected", reason: "invalid-source" };
    }
    if (!this.transients.acquireLock()) {
      this.transients.cleanup();
      this.stateValue = { phase: "cancelled", reason: "lock-unavailable" };
      return { status: "rejected", reason: "lock-unavailable" };
    }

    this.pressPoint = { ...input.pressClientPoint };
    this.stateValue = {
      phase: "armed",
      pointerId: input.pointerId,
      snapshotVersion: input.source.selection.snapshot.snapshotVersion,
      source: input.source
    };
    return { status: "armed" };
  }

  /**
   * Advances threshold, target, indicator, and auto-scroll state.
   *
   * @param input - Latest mounted pointer sample.
   * @returns Current armed/targeting/cancelled outcome.
   */
  update(input: EditorUIDragUpdateInput): EditorUIDragUpdateResult<TargetPayload> {
    const active = this.readActiveState();
    if (active === undefined || input.pointerId !== active.pointerId) return { status: "ignored" };
    if (!input.insideDropZone) return this.cancel("outside");
    if (input.snapshotVersion !== active.snapshotVersion) return this.cancel("stale");

    if (
      active.phase === "armed"
      && this.pressPoint !== undefined
      && !hasExceededEditorUIDragThreshold(this.pressPoint, input.clientPoint, this.threshold)
    ) {
      return { status: "armed" };
    }

    const target = normalizeEditorUIDragTarget(
      this.ports.resolveTarget({ source: active.source, update: input }),
      active
    );
    if (target.status === "rejected" && target.reason === "stale") {
      return this.cancel("stale");
    }

    this.transients.apply(target, input.autoScroll);
    this.stateValue = { ...active, phase: "targeting", target };
    return { status: "targeting", target };
  }

  /**
   * Returns one typed intent only from a current ready target.
   *
   * @param input - Final pointer and snapshot identity.
   * @returns Typed command-neutral intent or explicit rejection.
   */
  drop(input: { readonly pointerId: number; readonly snapshotVersion: number }): EditorUIDragDropResult<SourcePayload, TargetPayload> {
    const result = resolveEditorUIDragDrop(this.stateValue, input);
    if (result.status === "committed") {
      this.transients.cleanup();
      this.stateValue = { phase: "committed", intent: result.intent };
    } else if (result.status === "rejected") {
      this.cancel(result.reason);
    }
    return result;
  }

  /**
   * Remaps an active stable source after collaboration updates.
   *
   * @param remap - Ready selection or explicit structural-remap rejection.
   * @returns Remapped version or explicit rejection.
   */
  remapSource(remap: EditorUIDragSourceRemapInput): EditorUIDragRemapResult {
    const active = this.readActiveState();
    if (active === undefined) return { status: "rejected", reason: "inactive" };
    const resolution = resolveEditorUIDragSourceRemap(
      remap,
      active.source,
      active.snapshotVersion
    );
    if (resolution.status === "rejected") {
      this.cancel("source-remap-failed");
      return resolution;
    }

    this.transients.clearIndicator();
    this.transients.stopAutoScroll();
    this.stateValue = {
      phase: active.phase === "armed" ? "armed" : "dragging",
      pointerId: active.pointerId,
      snapshotVersion: resolution.selection.snapshot.snapshotVersion,
      source: resolution.source
    };
    return {
      status: "remapped",
      snapshotVersion: resolution.selection.snapshot.snapshotVersion
    };
  }

  /**
   * Handles command-neutral keyboard cancellation.
   *
   * @param event - Key and IME composition state.
   * @returns Whether Escape cancelled an active session.
   */
  handleKey(event: { readonly key: string; readonly isComposing: boolean }): boolean {
    if (event.key !== "Escape" || event.isComposing || this.readActiveState() === undefined) return false;
    this.cancel("escape");
    return true;
  }

  /**
   * Cancels an active session and releases every transient port exactly once.
   *
   * @param reason - Stable terminal reason.
   * @returns Cancelled outcome.
   */
  cancel(reason: EditorUIDragCancelReason): { readonly status: "cancelled"; readonly reason: EditorUIDragCancelReason } {
    this.transients.cleanup();
    this.stateValue = { phase: "cancelled", reason };
    return { status: "cancelled", reason };
  }

  /** Destroys the session and idempotently releases transient resources. */
  destroy(): void {
    this.transients.cleanup();
    this.stateValue = { phase: "destroyed" };
  }

  /**
   * Reads one active state variant.
   *
   * @returns Active state or undefined after a terminal transition.
   */
  private readActiveState(): Extract<EditorUIDragSessionState<SourcePayload, TargetPayload>, { readonly phase: "armed" | "dragging" | "targeting" }> | undefined {
    const state = this.stateValue;
    return state.phase === "armed" || state.phase === "dragging" || state.phase === "targeting"
      ? state
      : undefined;
  }

}
