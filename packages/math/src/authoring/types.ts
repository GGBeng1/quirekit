import type { MathDiagnostic, MathDocument } from '../model/types';
import type { MathVisualSelection, MathVisualSlot } from '../visual/types';
/** Panel draft state; it does not mutate the host document. */
export interface MathDraftState {
  /** Current input including invalid intermediate source. */
  readonly draft: string;
  /** Last valid projection for stable preview. */
  readonly preview: MathDocument;
  /** Current validation error, if any. */
  readonly diagnostic?: MathDiagnostic;
  /** Whether source changed from the committed record. */
  readonly dirty: boolean;
  /** Structural endpoints belonging to the last valid preview. */
  readonly selection: MathVisualSelection;
  /** Retained slot index; selection-only updates never rebuild it. */
  readonly slots: readonly MathVisualSlot[];
  /** Whether a previous local draft step exists. */
  readonly canUndo: boolean;
  /** Whether a later local draft step exists. */
  readonly canRedo: boolean;
}
/** Result of committing a panel draft to the host command. */
export type MathDraftCommit = { readonly ok: true; readonly document: MathDocument } | { readonly ok: false; readonly diagnostic: MathDiagnostic };

/** One bounded history entry, including the preview authority of invalid source. */
export interface MathDraftEntry {
  /** Exact valid or invalid source for this step. */
  readonly draft: string;
  /** Last valid formula at the time this step was accepted. */
  readonly preview: MathDocument;
  /** Blocking source diagnostic. */
  readonly diagnostic?: MathDiagnostic;
  /** Endpoints restored together with this source step. */
  readonly selection: MathVisualSelection;
}
