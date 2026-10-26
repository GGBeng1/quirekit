/** A chronological, host-owned slice of read-only process output. */
export interface QuireKitTerminalOutputChunk {
  /** Stable identity; append new chunks instead of replacing earlier identities. */
  readonly id: string;
  /** The originating process stream. */
  readonly stream: 'stdout' | 'stderr';
  /** Unmodified text, including any ANSI escape sequences. */
  readonly text: string;
}

/** Process status is display-only; this component never controls a process. */
export type QuireKitTerminalOutputState = 'running' | 'succeeded' | 'failed' | 'cancelled';

/** Public read-only terminal output contract. */
export interface QuireKitTerminalOutputProps {
  /** Chronological output chunks; their raw concatenation is the copy authority. */
  readonly chunks: readonly QuireKitTerminalOutputChunk[];
  /** Host-provided process state. */
  readonly state?: QuireKitTerminalOutputState;
  /** Host-provided exit code, when known. */
  readonly exitCode?: number;
  /** Accessible output name; the language pack supplies the default. */
  readonly label?: string;
  /** Maximum viewport height in CSS pixels. */
  readonly maxHeight?: number;
  /** Bounded rendered tail in UTF-16 code units; source data remains intact. */
  readonly maxVisibleCharacters?: number;
  /** Upstream truncation notice. When set, copying is disabled because the source is incomplete. */
  readonly truncated?: string;
}
