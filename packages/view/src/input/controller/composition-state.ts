/** Result produced when an IME composition session ends. */
export interface QuireInputCompositionEndResult {
  /** Final text to commit into the editor document. */
  readonly text: string;
  /** ProseMirror composition id used to group the committed transaction. */
  readonly compositionId: number;
}

/** Tracks IME composition state owned by the canvas input controller. */
export class QuireInputCompositionState {
  private composingValue: boolean;
  private textValue: string;
  private nextId: number;
  private activeId: number | null;
  private dispatchId: number | null;

  /**
   * Creates composition state.
   *
   * @param composing - Whether the controller starts inside a composition.
   */
  constructor(composing = false) {
    this.composingValue = composing;
    this.textValue = "";
    this.nextId = 1;
    this.activeId = null;
    this.dispatchId = null;
  }

  /**
   * Reports whether composition is currently active.
   *
   * @returns Whether the controller is composing.
   */
  get composing(): boolean {
    return this.composingValue;
  }

  /**
   * Returns the composition id currently applied to dispatched transactions.
   *
   * @returns Active dispatch composition id, or null outside composition commits.
   */
  get dispatchCompositionId(): number | null {
    return this.dispatchId;
  }

  /**
   * Starts a composition session.
   *
   * @param text - Initial preedit text reported by the browser.
   */
  start(text = ""): void {
    this.composingValue = true;
    this.activeId = this.nextId++;
    this.textValue = text;
  }

  /**
   * Updates the active composition preedit text.
   *
   * @param text - Latest preedit text reported by the browser.
   */
  update(text = ""): void {
    this.composingValue = true;
    this.textValue = text;
  }

  /**
   * Ends the active composition session and returns text to commit.
   *
   * @param text - Browser-provided committed text.
   * @returns Final text and transaction composition id.
   */
  end(text = ""): QuireInputCompositionEndResult {
    const committedText = text.length > 0 ? text : this.textValue;
    const compositionId = this.activeId ?? this.nextId++;

    this.cancel();

    return {
      text: committedText,
      compositionId
    };
  }

  /** Cancels any active composition session without committing text. */
  cancel(): void {
    this.composingValue = false;
    this.activeId = null;
    this.textValue = "";
  }

  /**
   * Temporarily applies a composition id to transactions dispatched by a callback.
   *
   * @param compositionId - Composition id to apply while dispatching.
   * @returns Previous dispatch composition id to restore later.
   */
  beginDispatch(compositionId?: number): number | null {
    const previous = this.dispatchId;

    this.dispatchId = compositionId ?? null;

    return previous;
  }

  /**
   * Restores a previous dispatch composition id.
   *
   * @param compositionId - Previous dispatch composition id.
   */
  restoreDispatch(compositionId: number | null): void {
    this.dispatchId = compositionId;
  }
}
