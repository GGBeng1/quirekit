import { parseMathLatex } from '../latex/parse';
import type { MathDocument } from '../model/types';
import { freezeMathValue } from '../shared/freeze';
import { getMathVisualSlots } from '../visual/slots';
import { isMathSelection, restoreMathSelection } from '../visual/selection';
import type { MathVisualSelection, MathVisualSlot } from '../visual/types';
import type { MathDraftCommit, MathDraftEntry, MathDraftState } from './types';

const emptyDocument: MathDocument = freezeMathValue({ grammar: 'quirekit-latex-v1', latex: '', root: { kind: 'sequence', children: [], source: { start: 0, end: 0 } } });

/**
 * Creates the history entry for host source, which may be unsupported.
 * @param latex - Exact host source.
 * @param result - Its parse result.
 * @returns Entry whose preview is the source itself, or an empty preview plus a diagnostic.
 */
function hostEntry(latex: string, result: ReturnType<typeof parseMathLatex>): MathDraftEntry {
  const preview = result.ok ? freezeMathValue(result.document) : emptyDocument;
  return { draft: latex, preview, selection: { focus: { slot: 'root', index: preview.root.children.length } }, ...(!result.ok ? { diagnostic: result.diagnostic } : {}) };
}

/**
 * Local draft/history authority; reads never parse and selection never adds a step.
 * Unsupported host source is kept as an invalid draft, so it can be repaired in source form.
 */
export class MathAuthoringSession {
  private committed: string;
  private host: MathDraftEntry;
  private history: MathDraftEntry[];
  private position = 0;
  private state!: MathDraftState;
  private slots: readonly MathVisualSlot[];
  private indexed: MathDocument;
  /**
   * Starts from host source without rewriting it.
   * @param latex - Exact committed source; unsupported source starts as an invalid draft.
   */
  constructor(latex: string) {
    this.committed = latex;
    this.host = hostEntry(latex, parseMathLatex(latex));
    this.indexed = this.host.preview;
    this.slots = freezeMathValue(getMathVisualSlots(this.indexed));
    this.history = [this.host];
    this.refresh();
  }
  /**
   * Reads the stable immutable snapshot without parsing source.
   * @returns Current local draft state.
   */
  getState(): MathDraftState {
    return this.state;
  }
  /**
   * Records source and selection as one bounded local history step.
   * @param latex - Exact source, including invalid intermediate drafts.
   * @param selection - Optional caret from a complete structural edit.
   * @returns Updated immutable draft state.
   */
  update(latex: string, selection?: MathVisualSelection): MathDraftState {
    if (latex === this.state.draft) {
      if (selection) this.select(selection);
      return this.state;
    }
    const result = parseMathLatex(latex);
    const preview = result.ok ? freezeMathValue(result.document) : this.state.preview;
    const slots = result.ok ? getMathVisualSlots(preview) : this.slots;
    const entry: MathDraftEntry = {
      draft: latex,
      preview,
      selection: restoreMathSelection(slots, selection ?? this.state.selection),
      ...(!result.ok ? { diagnostic: result.diagnostic } : {}),
    };
    this.history = this.history.slice(0, this.position + 1);
    this.history.push(entry);
    this.position++;
    if (this.history.length > 100) {
      this.history.shift();
      this.position--;
    }
    this.indexed = preview;
    this.slots = freezeMathValue(slots);
    this.refresh();
    return this.state;
  }
  /**
   * Changes only current endpoints, retaining their position in local undo history.
   * @param selection - Complete boundaries in the current accepted preview.
   * @returns Whether valid endpoints were accepted.
   */
  select(selection: MathVisualSelection): boolean {
    if (!isMathSelection(this.slots, selection)) return false;
    if (JSON.stringify(selection) === JSON.stringify(this.state.selection)) return true;
    const copy = { focus: { ...selection.focus }, ...(selection.anchor ? { anchor: { ...selection.anchor } } : {}) };
    this.history[this.position] = { ...this.history[this.position]!, selection: copy };
    this.refresh();
    return true;
  }
  /**
   * Restores the previous source and its exact structural caret.
   * @returns Updated draft state.
   */
  undo(): MathDraftState {
    if (this.position > 0) {
      this.position--;
      this.refresh();
    }
    return this.state;
  }
  /**
   * Restores the next source and its exact structural caret.
   * @returns Updated draft state.
   */
  redo(): MathDraftState {
    if (this.position + 1 < this.history.length) {
      this.position++;
      this.refresh();
    }
    return this.state;
  }
  /**
   * Reads already validated source without accepting the draft.
   * @returns Complete document or a blocking source diagnostic.
   */
  prepareCommit(): MathDraftCommit {
    return this.state.diagnostic ? { ok: false, diagnostic: this.state.diagnostic } : { ok: true, document: this.state.preview };
  }
  /**
   * Accepts the draft only after a successful host transaction.
   * @returns Accepted complete document or source diagnostic.
   */
  acceptCommit(): MathDraftCommit {
    const result = this.prepareCommit();
    if (result.ok) {
      this.committed = result.document.latex;
      this.host = this.history[this.position]!;
      this.history = [this.host];
      this.position = 0;
      this.refresh();
    }
    return result;
  }
  /**
   * Discards local changes without changing the host document.
   * @returns Committed source with a valid caret.
   */
  cancel(): MathDraftState {
    this.history = [{ ...this.host, selection: { focus: { slot: 'root', index: this.host.preview.root.children.length } } }];
    this.position = 0;
    this.refresh();
    return this.state;
  }
  /** Publishes once per accepted local change; slots are rebuilt only for a new preview. */
  private refresh(): void {
    const entry = this.history[this.position]!;
    if (entry.preview !== this.indexed) {
      this.indexed = entry.preview;
      this.slots = freezeMathValue(getMathVisualSlots(entry.preview));
    }
    this.state = freezeMathValue({
      ...entry,
      slots: this.slots,
      dirty: entry.draft !== this.committed,
      canUndo: this.position > 0,
      canRedo: this.position + 1 < this.history.length,
    });
  }
}
