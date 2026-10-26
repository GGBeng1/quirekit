import type { MathEditor } from '@quirekit/math';

/** Visual input controlled by the panel's last complete formula. */
export interface MathVisualInputProps {
  /** Borrowed headless authority; this view owns no formula history or selection. */
  readonly editor: MathEditor;
  /** Retains selection decoration while an owned chooser receives focus. */
  readonly showSelection?: boolean;
}
/** Public panel-to-input actions; none mutate the host document. */
export interface MathVisualInputHandle {
  /** Restores the retained internal caret after owned chooser dismissal. */
  readonly focus: () => void;
}
