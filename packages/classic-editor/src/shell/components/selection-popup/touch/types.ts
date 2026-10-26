import type { ClassicEditorRenderContext } from "@classic/types";

/** Product ownership for a short tap inside an existing text range. */
export interface SelectedTextTapOptions {
  /** Root used to exclude sibling editors and product controls. */
  readonly root: HTMLElement;
  /** Current mounted editor with public hit-test geometry. */
  readonly editor: ClassicEditorRenderContext["editor"];
  /** Visibility before document-level outside dismissal runs. */
  readonly isVisible: () => boolean;
  /** Applies the accepted visibility without a selection transaction. */
  readonly toggle: (visible: boolean) => void;
}

/** Immutable semantic and pointer identities retained only during a candidate tap. */
export interface SelectedTextTapCandidate {
  /** Original touch sample in client CSS pixels. */
  readonly event: PointerEvent;
  /** Selection identity prevents consuming taps after unrelated selection changes. */
  readonly selection: SelectedTextTapOptions["editor"]["state"]["pm"]["selection"];
  /** Document identity prevents interpreting positions against a different layout. */
  readonly doc: SelectedTextTapOptions["editor"]["state"]["doc"];
  /** Original visibility, captured before pointer gating hides the surface. */
  readonly visible: boolean;
}
