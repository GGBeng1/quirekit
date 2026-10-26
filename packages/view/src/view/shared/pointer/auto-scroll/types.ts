import type { QuireClientPoint } from "@quirekit/view-engine";
import type { AncestorScroller } from "../../viewport";
import type { MountedViewScrollInset } from "../../scroll";

/** Schedules one pointer auto-scroll frame. */
export type MountedPointerAutoScrollFrameScheduler = (
  callback: FrameRequestCallback
) => number;

/** Options for the shared mounted pointer auto-scroll controller. */
export interface CreateMountedPointerAutoScrollControllerOptions {
  /** Mounted root whose nearest scrollable ancestor owns viewport movement. */
  readonly root: HTMLElement;
  /** Per-side distance from the scrollport edge that activates following. */
  readonly edgeThreshold: MountedViewScrollInset;
  /** Re-resolves the active selection head after an actual scroll step. */
  readonly onScrollFrame: (clientPoint: QuireClientPoint) => void;
  /** Optional ancestor resolver used by focused tests. */
  readonly resolveScroller?: (() => AncestorScroller | undefined) | undefined;
  /** Optional frame scheduler used by focused tests. */
  readonly requestFrame?: MountedPointerAutoScrollFrameScheduler | undefined;
  /** Optional frame cancellation used by focused tests. */
  readonly cancelFrame?: ((frameId: number) => void) | undefined;
}

/** Lifecycle owned by one mounted pointer session. */
export interface MountedPointerAutoScrollController {
  /** Retains the latest moving selection target and starts edge scrolling. */
  update(clientPoint: QuireClientPoint): void;
  /** Cancels scheduled scrolling and forgets the retained target. */
  stop(): void;
}
