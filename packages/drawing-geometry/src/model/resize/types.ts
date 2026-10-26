import type { DrawingExtent } from "../types";

/** One transient document-space width magnet captured at gesture start. */
export interface DrawingResizeWidthSnap {
  /** Exact admitted width near which horizontal gestures snap. */
  readonly targetWidth: number;
  /** Nonnegative document-space distance permitting attraction. */
  readonly tolerance: number;
}

/** Owner-supplied transient geometry constraints, independent of document formats. */
export interface DrawingResizePolicy {
  /** Smallest admitted document-space extent. */
  readonly minimumExtent?: DrawingExtent;
  /** Largest admitted document-space extent. */
  readonly maximumExtent?: DrawingExtent;
  /** Positive document-space size grid shared by preview and final commit. */
  readonly extentStep?: number;
  /** Whether the source origin stays fixed while resizing an inline object. */
  readonly preserveOrigin?: boolean;
  /** Tolerance requesting a magnet at the containing inline-content width. */
  readonly snapToInlineContentWidth?: number;
  /** Resolved magnet, independent of pagination and document semantics. */
  readonly widthSnap?: DrawingResizeWidthSnap;
}
