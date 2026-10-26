import type { ClassicEditorShellModel } from "../../types";

/** Inputs required by the generic non-empty text-selection Popup Menu. */
export interface ClassicEditorSelectionPopupProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
  /** Product root that supplies theme variables and the owner document. */
  readonly root: HTMLElement | undefined;
}
