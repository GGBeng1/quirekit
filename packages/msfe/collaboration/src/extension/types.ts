import type { CollaborationSession } from "../session/session";

/** Explicit source collaboration installation. */
export interface CollaborationExtensionOptions {
  /** Prepared opaque session; omitted configuration fails before editor mounting. */
  readonly session: CollaborationSession | null;
}
