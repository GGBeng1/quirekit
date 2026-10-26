import type { EditorUIClientAnchorResolution } from "@quirekit/editor-ui";
import type { ClassicEditorText } from "../base";

/** Exact object availability retained independently from the live selection. */
export type ClassicEditorObjectFreshnessStatus =
  | "ready"
  | "stale"
  | "locked"
  | "read-only"
  | "unavailable";

/** Owner-supplied freshness for one stable object identity. */
export interface ClassicEditorObjectFreshness {
  /** Owner-local monotonic freshness revision. */
  readonly revision: number;
  /** Availability of the exact retained object. */
  readonly status: ClassicEditorObjectFreshnessStatus;
  /** Stable localizable reason shown when the target is not ready. */
  readonly reason: ClassicEditorText | null;
}

/** Stable object target shared by chrome, actions, status, and Inspector. */
export interface ClassicEditorObjectTarget {
  /** Feature-owned stable object identity. */
  readonly id: string;
  /** Feature owner responsible for resolving and mutating the object. */
  readonly ownerId: string;
  /** Opaque owner revision captured with the target. */
  readonly revision: string;
  /** Semantic object family used only for presentation and diagnostics. */
  readonly kind: string;
  /** Localizable target summary shown by every object surface. */
  readonly label: ClassicEditorText;
  /** Canonical client projection produced from retained View geometry. */
  readonly anchor: EditorUIClientAnchorResolution;
}

/** Exact revalidation result returned by the feature owner. */
export interface ClassicEditorObjectTargetResolution {
  /** Stable target being revalidated; it must match the captured identity. */
  readonly target: ClassicEditorObjectTarget;
  /** Latest exact-target freshness without current-selection fallback. */
  readonly freshness: ClassicEditorObjectFreshness;
}
