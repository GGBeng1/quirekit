import type { QuireBlockPointerLease } from "@quirekit/core";

/** Registered mounted pointer owner, shared by all paginated backends. */
export interface MountedBlockPointerOwner {
  /** Starts one exclusive primary-pointer lease. */
  readonly begin: (event: PointerEvent, lease: QuireBlockPointerLease) => (() => void) | null;
  /** Cancels a stale document or revoked editable lease. */
  readonly validate: () => void;
  /** Whether block dragging owns pointer routing. */
  readonly active: () => boolean;
  /** Idempotent terminal cleanup. */
  readonly cancel: () => void;
}
