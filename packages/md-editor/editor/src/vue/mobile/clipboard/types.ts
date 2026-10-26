/** Outcome of one versioned source operation, separate from platform permissions. */
export type MobileClipboardResult = "accepted" | "conflict" | "failed" | "empty";

/** One cancellable selection intent, shared by an async read and its manual fallback. */
export interface MobileClipboardIntent {
  /** Aborts on source, selection, permission, composition or document-lifetime changes. */
  readonly signal: AbortSignal;
  /** @returns Whether the exact original source intent is still available. */
  current(): boolean;
  /** @param cut - Delete only after publication. @param publish - Explicit platform write. @returns Guarded outcome. */
  copy(cut: boolean, publish: (source: string) => Promise<void>): Promise<MobileClipboardResult>;
  /** @param text - System or explicitly submitted fallback text. @returns One native paste transaction's outcome. */
  paste(text: string): MobileClipboardResult;
  /** Releases the anchor and bounded accepted-state subscription. */
  release(): void;
}
