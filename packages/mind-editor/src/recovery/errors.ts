/** Local recovery failure with a translatable workspace message key. */
export class MindMapRecoveryError extends Error {
  /** @param code - Recovery-specific message key. */
  constructor(readonly code: "draftIdentity" | "draftFormat" | "draftLimit" | "draftChanged" | "draftStale" | "draftStorage" | "draftAborted" | "draftBlocked") {
    super(code); this.name = "MindMapRecoveryError";
  }
}
