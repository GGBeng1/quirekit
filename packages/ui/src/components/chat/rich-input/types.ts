/** A resolved mention or command embedded in the literal Composer draft. */
export interface QuireKitChatInputToken {
  /** Stable identity of this occurrence, distinct from the referenced candidate. */
  readonly id: string;
  /** Feature-owned identity to resolve when the draft is submitted. */
  readonly key: string;
  /** Trigger family. */
  readonly kind: 'mention' | 'command';
  /** Half-open UTF-16 range in the literal draft, including the trigger character. */
  readonly from: number;
  /** Exclusive end of the token's visible text. */
  readonly to: number;
  /** Visible text, including the trigger character. */
  readonly text: string;
}

/** Candidate supplied by the feature; the input never fetches business data itself. */
export interface QuireKitChatInputCandidate {
  /** Feature-owned stable identity. */
  readonly key: string;
  /** Primary candidate label, without @ or /. */
  readonly label: string;
  /** Optional concise supporting text. */
  readonly description?: string;
  /** Inserted text without the trigger, when different from label. */
  readonly insertText?: string;
  /** Unavailable candidates remain visible but cannot be selected. */
  readonly disabled?: boolean;
}

/** Current candidate query and replacement range. */
export interface QuireKitChatInputQuery {
  /** Trigger family. */
  readonly kind: 'mention' | 'command';
  /** Text typed after the trigger. */
  readonly search: string;
  /** Inclusive start of the trigger. */
  readonly from: number;
  /** Caret position that ends the query. */
  readonly to: number;
}

/** Caret or selected range in UTF-16 offsets. */
export interface QuireKitChatInputSelection {
  /** Selection anchor minimum. */
  readonly from: number;
  /** Selection end maximum. */
  readonly to: number;
}

/** Atomic view of the draft, including resolved references. */
export interface QuireKitChatInputSnapshot {
  /** Literal text submitted by Composer. */
  readonly text: string;
  /** Tokens whose ranges refer to text. */
  readonly tokens: readonly QuireKitChatInputToken[];
  /** Current selection. */
  readonly selection: QuireKitChatInputSelection;
}

/** Public input adapter properties. */
export interface QuireKitChatRichInputProps {
  /** Controlled literal text. */
  readonly modelValue: string;
  /** Controlled structured tokens; changes are emitted separately and atomically in change. */
  readonly tokens: readonly QuireKitChatInputToken[];
  /** Accessible field name. */
  readonly label: string;
  /** Host-specific empty field hint; the language pack supplies the default. */
  readonly placeholder?: string;
  /** Enter submits unless a candidate list owns it. */
  readonly submitMode?: 'enter' | 'button';
  /** Minimum visible lines. */
  readonly rows?: number;
  /** Maximum auto-resized lines. */
  readonly maxRows?: number;
  /** Suppress editing and candidate lookup. */
  readonly disabled?: boolean;
  /** Allow selection and copy, but not editing or candidate lookup. */
  readonly readOnly?: boolean;
  /** Feature resolver; AbortSignal is canceled on query change and unmount. */
  readonly resolveCandidates: (query: QuireKitChatInputQuery, signal: AbortSignal) => readonly QuireKitChatInputCandidate[] | Promise<readonly QuireKitChatInputCandidate[]>;
}

/** Public methods of a rich-input adapter mounted in Composer's input slot. */
export interface QuireKitChatRichInputInstance {
  /** Focus the owned native field without replacing the selection.
   * @param options - Native focus options.
   */
  focus(options?: FocusOptions): void;
  /** Return the latest atomic draft state.
   * @returns Draft, tokens and selection.
   */
  getSnapshot(): QuireKitChatInputSnapshot;
  /** Restore an input selection after external UI work.
   * @param selection - UTF-16 selection range.
   */
  setSelection(selection: QuireKitChatInputSelection): void;
}
