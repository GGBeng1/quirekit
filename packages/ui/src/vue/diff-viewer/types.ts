/** One displayed line of a verified unified-diff hunk. */
export interface DiffRow {
  /** Context, addition, removal, or a non-counted no-newline note. */
  readonly kind: 'context' | 'added' | 'removed' | 'note';
  /** Source line in the old file, when present. */
  readonly oldNumber: number | null;
  /** Source line in the new file, when present. */
  readonly newNumber: number | null;
  /** Text following the unified-diff prefix. */
  readonly text: string;
}

/** Verified hunk header and all its rows. */
export interface DiffHunk {
  /** Exact header from the patch. */
  readonly header: string;
  /** Stable order within the patch. */
  readonly index: number;
  /** Parsed rows with separate old and new counters. */
  readonly rows: readonly DiffRow[];
  /** Added line count. */
  readonly additions: number;
  /** Removed line count. */
  readonly removals: number;
}

/** Metadata and hunks retain their source ordering. */
export type DiffSegment =
  | { readonly kind: 'metadata'; readonly lines: readonly string[] }
  | { readonly kind: 'hunk'; readonly hunk: DiffHunk };

/** Structured patch or an explicit raw-source fallback. */
export type DiffParseResult =
  | { readonly kind: 'diff'; readonly segments: readonly DiffSegment[]; readonly additions: number; readonly removals: number }
  | { readonly kind: 'invalid' | 'large' };
