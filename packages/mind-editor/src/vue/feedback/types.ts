/** Result feedback that never participates in the editor's layout. */
export interface MindEditorFeedbackProps {
  /** Nonempty feedback opens the dialog; clearing it dismisses the result. */ readonly message: string;
  /** Accessible task result title. */ readonly title?: string;
  /** Uses the larger shared dialog for conversion details. */ readonly detailed?: boolean;
  /** Acknowledges a completed result without committing another operation. */ readonly dismissLabel?: string;
  /** Explicit return target when the original file picker no longer exists. */ readonly finalFocusEl?: () => HTMLElement | null;
}
