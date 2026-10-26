/** One option in an editor-owned, focus-preserving suggestion list. */
export interface QuireKitCandidateListItem {
  /** Stable feature identity. */
  readonly key: string;
  /** Localized primary label. */
  readonly label: string;
  /** Optional secondary explanation. */
  readonly description?: string;
  /** Unavailable options remain readable but cannot be activated. */
  readonly disabled?: boolean;
}

/** Presentation contract; the owning editor retains keyboard focus and navigation. */
export interface QuireKitCandidateListProps {
  /** Stable DOM id used by aria-controls. */
  readonly id: string;
  /** Accessible name for the suggestion set. */
  readonly label: string;
  /** Visible candidates in feature order. */
  readonly items: readonly QuireKitCandidateListItem[];
  /** Highlighted candidate identity controlled by the editor. */
  readonly activeKey?: string | undefined;
}
