import type { MathDiagnostic, MathDocument } from '../model/types';
import type { MathRenderer, MathPresentationSnapshot } from '../presentation/types';
import type { MathTemplate } from '../templates/types';
import type { MathVisualSelection, MathVisualDirection, MathVisualSlot } from '../visual/types';
import type { MathAuthoringSession } from '../authoring/session';

/** Explicit creation of a framework-independent formula editor. */
export interface MathEditorOptions {
  /** Exact host source; unsupported source opens as an invalid draft with a diagnostic, never throwing. */
  readonly latex: string;
  /** Optional output backend; omitted for source/structure-only consumers. */
  readonly renderer?: MathRenderer;
  /** Transfers renderer disposal to the editor; otherwise it is borrowed. */
  readonly disposeRenderer?: boolean;
  /** Initially suspends editing without discarding local state. */
  readonly disabled?: boolean;
  /**
   * Applies one complete formula through the host's own transaction/storage path.
   * @param document - Supported formula retaining exact author source.
   * @returns True only after the host accepted its update.
   */
  readonly commit?: (document: MathDocument) => boolean | Promise<boolean>;
}
/** Local feedback identity; consumers supply their own visible wording. */
export type MathEditorFeedback = 'unsupported-input' | 'unsupported-host' | 'host-rejected' | 'host-error';
/** Outcome of a single explicit host commit. */
export type MathCommitResult =
  | { readonly status: 'committed'; readonly document: MathDocument }
  | { readonly status: 'blocked' | 'rejected' | 'error' | 'conflict' | 'disposed' };

/** Immutable external-store snapshot; reads have no parsing or layout side effects. */
export interface MathEditorSnapshot {
  /** Monotonic accepted state version, including pure selection changes. */
  readonly revision: number;
  /** Exact current source, including invalid intermediate drafts. */
  readonly draft: string;
  /** Last complete valid source and structure, retained through invalid input. */
  readonly document: MathDocument;
  /** Blocking grammar diagnostic. */
  readonly diagnostic?: MathDiagnostic | undefined;
  /** Whether the exact draft differs from the last host-accepted source. */
  readonly dirty: boolean;
  /** Previous local history exists. */
  readonly canUndo: boolean;
  /** Later local history exists. */
  readonly canRedo: boolean;
  /** Complete child boundaries within one structural slot. */
  readonly selection: MathVisualSelection;
  /** Retained structural index, rebuilt only for a new valid document. */
  readonly slots: readonly MathVisualSlot[];
  /** Explicit host read-only/suspension state. */
  readonly disabled: boolean;
  /** A host commit is still pending. */
  readonly busy: boolean;
  /** External source changed while a draft or commit was active. */
  readonly conflict: boolean;
  /** Whether a native or custom input currently owns formula focus. */
  readonly focused: boolean;
  /** Native IME owns a composition session. */
  readonly composing: boolean;
  /** Transient candidate text, never saved as formula source. */
  readonly preedit: string;
  /** Command search UI, opened by `\`, should be shown by the consumer. */
  readonly commandOpen: boolean;
  /** Framework-independent feedback identity. */
  readonly feedback?: MathEditorFeedback | undefined;
  /** Current graphic/readiness facts from the injected renderer. */
  readonly presentation: MathPresentationSnapshot;
  /** Structural editing is admitted; composition routing remains separate. */
  readonly canEdit: boolean;
  /** A complete supported draft is ready for an explicit configured host commit. */
  readonly canCommit: boolean;
  /** Final lifetime state; disposed instances accept no operations. */
  readonly disposed: boolean;
}

/** Normalized keyboard facts without native browser or framework types. */
export interface MathKeyboardInput {
  /** Native or application key identity. */
  readonly key: string;
  /** Control modifier. */
  readonly ctrlKey?: boolean;
  /** Platform command modifier. */
  readonly metaKey?: boolean;
  /** Alternate modifier. */
  readonly altKey?: boolean;
  /** Selection extension or reverse navigation modifier. */
  readonly shiftKey?: boolean;
  /** Browser composition guard. */
  readonly isComposing?: boolean;
  /** Legacy IME processing key guard. */
  readonly keyCode?: number;
}
/** Normalized text edit intent following IME arbitration. */
export interface MathTextInput {
  /** Input Events operation name. */
  readonly inputType: string;
  /** Optional literal mathematical insertion. */
  readonly data?: string | null;
  /** Composition events remain owned by the IME adapter. */
  readonly isComposing?: boolean;
}
/** A consumer applies native cancellation/focus effects after the core decision. */
export interface MathInputDecision {
  /** Cancel the corresponding native edit when true. */
  readonly handled: boolean;
  /** The native input should relinquish focus. */
  readonly blur?: boolean;
}

/** All source, selection, shortcut and host lifecycle operations share one authority. */
export interface MathEditor {
  /** @returns Stable current immutable state. */
  getSnapshot(): MathEditorSnapshot;
  /**
   * @param listener - Accepted snapshot listener.
   * @returns Idempotent unsubscribe.
   */
  subscribe(listener: (snapshot: MathEditorSnapshot) => void): () => void;
  /**
   * @param latex - Exact draft, including invalid source.
   * @returns Whether editing was allowed.
   */
  setLatex(latex: string): boolean;
  /** @param latex - Latest host source; conflicts preserve the local draft. */
  syncHost(latex: string): void;
  /** @returns Whether the latest host source was admitted and the local draft discarded. */
  reload(): boolean;
  /**
   * @param text - Literal math characters.
   * @returns Whether insertion succeeded.
   */
  insertText(text: string): boolean;
  /**
   * @param template - Admitted structural template.
   * @returns Whether insertion succeeded.
   */
  insertTemplate(template: MathTemplate): boolean;
  /**
   * @param value - Catalog template or symbol identity.
   * @returns Whether insertion succeeded.
   */
  chooseCommand(value: string): boolean;
  /**
   * @param selection - Current-document structural boundaries.
   * @returns Whether they are valid.
   */
  select(selection: MathVisualSelection): boolean;
  /**
   * @param direction - Structural movement.
   * @param extend - Extends same-slot selection.
   */
  move(direction: MathVisualDirection, extend?: boolean): void;
  /** @param forward - Deletes after rather than before the caret. */
  delete(forward?: boolean): void;
  /** Selects the whole supported formula without changing source. */
  selectAll(): void;
  /** Restores the previous draft and its structural selection. */
  undo(): void;
  /** Restores the next draft and its structural selection. */
  redo(): void;
  /** Discards local changes; does not invoke host persistence. */
  cancel(): void;
  /** @returns Correlated outcome of the configured host transaction. */
  commit(): Promise<MathCommitResult>;
  /** @param disabled - Host suspension/read-only state. */
  setDisabled(disabled: boolean): void;
  /** @param focused - Whether native/custom formula input owns focus. */
  setFocused(focused: boolean): void;
  /**
   * @param composing - IME ownership.
   * @param preedit - Transient candidate display text.
   */
  setComposition(composing: boolean, preedit: string): void;
  /** @param open - Whether the consumer's command search owns interaction. */
  setCommandOpen(open: boolean): void;
  /**
   * @param input - Framework-neutral keyboard facts.
   * @returns Native effects to apply.
   */
  handleKeyDown(input: MathKeyboardInput): MathInputDecision;
  /**
   * @param input - Text intent after IME arbitration.
   * @returns Native effects to apply.
   */
  handleBeforeInput(input: MathTextInput): MathInputDecision;
  /** Invalidates late results, subscriptions and explicitly owned renderer resources. */
  destroy(): void;
}

/** Private mutable lifecycle facts; only copied immutable snapshots are published. */
export interface MathEditorRuntimeState {
  /** Host commit ownership. */
  busy: boolean;
  /** Host/draft conflict. */
  conflict: boolean;
  /** Explicit editing suspension. */
  disabled: boolean;
  /** Native input focus. */
  focused: boolean;
  /** IME session ownership. */
  composing: boolean;
  /** Transient IME text. */
  preedit: string;
  /** Command search ownership. */
  commandOpen: boolean;
  /** Visible feedback identity. */
  feedback: MathEditorFeedback | undefined;
  /** Final lifetime state. */
  disposed: boolean;
}
/** Private host lifecycle ports into the single canonical draft authority. */
export interface MathEditorHostPort {
  /** @returns Current detached local session. */
  session(): MathAuthoringSession;
  /** @param session - Replacement after explicit source admission. */
  replace(session: MathAuthoringSession): void;
  /** Publishes accepted facts and current presentation dependencies. */
  refresh(): void;
  /** @returns Whether current validation/rendering permits the host call. */
  canCommit(): boolean;
  /** Mutable lifetime facts owned by the controller, never exposed to consumers. */
  readonly state: MathEditorRuntimeState;
}
/** Private ports through which editing operations reach the controller's single state. */
export interface MathEditorOperationPort {
  /** @returns Current detached local session. */
  session(): MathAuthoringSession;
  /** @returns Retained slot index of the current preview. */
  slots(): readonly MathVisualSlot[];
  /** @returns Whether structural editing may run now. */
  editable(): boolean;
  /** @returns Whether source or history changes may run now, including on an invalid draft. */
  sourceEditable(): boolean;
  /** Publishes changed facts without new presentation work. */
  publish(): void;
  /** Publishes after a content change, advancing presentation. */
  refresh(): void;
  /** Mutable lifetime facts owned by the controller. */
  readonly state: MathEditorRuntimeState;
}
/** Local editing operations of one editor instance. */
export type MathEditorOperations = Pick<MathEditor, 'setLatex' | 'insertText' | 'insertTemplate' | 'chooseCommand' | 'select' | 'move' | 'delete' | 'selectAll' | 'undo' | 'redo'>;
