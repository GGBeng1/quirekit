import type { MathDocument, MathEditor } from '@quirekit/math';
import type { MathUiLocale } from './locale/types';

/** Shared panel inputs; the host retains all document mutation authority. */
export interface MathAuthoringPanelProps {
  /** Valid source at opening; an external change is never silently merged into a dirty draft. */
  readonly latex: string;
  /**
   * Commits through the host's typed command and reports whether it succeeded.
   * @param document - Complete supported formula, retaining exact author source.
   * @returns True only after the host transaction succeeds.
   */
  readonly commit: (document: MathDocument) => boolean | Promise<boolean>;
  /** Moves input focus into the formula when the panel mounts, for hosts that open it on demand. */
  readonly autofocus?: boolean | undefined;
  /** Container for floating choosers; hosts that dismiss on outside clicks pass their own surface. */
  readonly popupTarget?: HTMLElement | undefined;
  /** Interface language, Chinese by default. */
  readonly locale?: MathUiLocale | undefined;
}

/** Vue presentation of a caller-owned headless formula editor. */
export interface MathEditorViewProps {
  /** External instance; unmounting the view never disposes it or its renderer. */
  readonly editor: MathEditor;
  /** Moves input focus into the formula when the view mounts. */
  readonly autofocus?: boolean | undefined;
  /** Container for floating choosers, defaulting to `body`. */
  readonly popupTarget?: HTMLElement | undefined;
  /** Interface language, Chinese by default. */
  readonly locale?: MathUiLocale | undefined;
}
