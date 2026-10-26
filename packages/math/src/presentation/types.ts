import type { MathDocument } from '../model/types';
import type { MathFormulaLayout } from '../output/layout/types';

/** Renderer-neutral dependencies of one immutable formula output. */
export interface MathRenderOptions {
  /** Includes complete editing slots and empty argument placeholders. */
  readonly editable?: boolean;
  /** Mathematical presentation style. */
  readonly display?: 'inline' | 'block';
}
/** Replaceable renderer; no backend or framework types cross this seam. */
export interface MathRenderer {
  /**
   * Lays out one admitted formula with graphic and geometry from the same operation.
   * @param document - Exact supported source and structure.
   * @param options - Explicit output dependencies.
   * @returns Complete immutable output, immediately or asynchronously.
   */
  render(document: MathDocument, options?: MathRenderOptions): MathFormulaLayout | Promise<MathFormulaLayout>;
  /**
   * Reports actual layout work, when the backend has counters.
   * @returns Completed backend layout attempts.
   */
  getStats?(): { readonly layouts: number };
  /** Releases resources only when the caller has granted ownership. */
  dispose?(): void;
}
/** Explicit ownership of a controlled formula presenter. */
export interface MathPresentationOptions {
  /** Caller-selected output backend. */
  readonly renderer: MathRenderer;
  /** Produces authoring geometry rather than a display-only illustration. */
  readonly editable?: boolean;
  /** Transfers final disposal to this presenter; defaults to borrowed ownership. */
  readonly disposeRenderer?: boolean;
}
/** Stable immutable external-store snapshot of a controlled presentation. */
export interface MathPresentationSnapshot {
  /** Last successful graphic, retained while the newest output is unavailable. */
  readonly layout?: MathFormulaLayout | undefined;
  /** Whether the graphic and slots match the latest visible document. */
  readonly ready: boolean;
  /** Whether visible presentation work remains. */
  readonly pending: boolean;
  /** Backend failure, independent of formula grammar admission. */
  readonly error?: string | undefined;
  /** Actual completed backend layout attempts or provider requests without counters. */
  readonly layouts: number;
}
/** Framework-independent presentation lifecycle. */
export interface MathPresentation {
  /**
   * Reads a stable snapshot without scheduling work.
   * @returns Current graphic/readiness state.
   */
  getSnapshot(): MathPresentationSnapshot;
  /**
   * Subscribes to accepted presentation changes.
   * @param listener - Called after a new immutable snapshot is available.
   * @returns Idempotent unsubscribe function.
   */
  subscribe(listener: (snapshot: MathPresentationSnapshot) => void): () => void;
  /**
   * Requests only the latest visible source; hidden previews perform no work.
   * @param document - Complete immutable formula.
   * @param visible - Whether a consumer is showing this projection.
   */
  update(document: MathDocument, visible?: boolean): void;
  /** Invalidates pending results, subscriptions and explicitly owned resources. */
  destroy(): void;
}
