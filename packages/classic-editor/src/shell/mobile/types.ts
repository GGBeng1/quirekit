import type { ClassicEditorRenderContext, ClassicEditorZoomMode } from "../../types";
import type { ClassicEditorShellModel, ClassicEditorShellRegions } from "../types";
import type { ClassicEditorStageController } from "../stage/types";

/** Desktop presentation values retained across compact Shell replacements. */
export interface ClassicMobileDesktopPreferences {
  /** Desktop reading percentage before compact adaptation. */
  readonly zoom: number;
  /** Desktop zoom intent, restored after the measured percentage. */
  readonly zoomMode: ClassicEditorZoomMode;
  /** Desktop left-panel visibility. */
  readonly leftVisible: boolean;
  /** Desktop right-panel visibility. */
  readonly rightVisible: boolean;
}

/** Instance-owned responsive controller inputs. */
export interface ClassicMobileShellOptions {
  /** Retained shell hosts; none is replaced on resize. */
  readonly elements: ClassicEditorShellRegions;
  /** Reactive presentation state shared with Vue. */
  readonly model: ClassicEditorShellModel;
  /** Canonical page geometry and reading transform owner. */
  readonly stage: ClassicEditorStageController;
}

/** Visual viewport values read together in one measurement. */
export interface ClassicMobileVisualSample {
  /** Visual viewport top in document coordinates. */
  readonly pageTop: number;
  /** Visual viewport height in CSS px. */
  readonly height: number;
  /** Client top of the `html` element, i.e. the document origin in client coordinates. */
  readonly documentTop: number;
}

/** Part of the host the compact root occupies while following the visual viewport. */
export interface ClassicMobileVisualFrame {
  /** Distance from the host top to the visible top, in CSS px. */
  readonly offset: number;
  /** Visible host height, in CSS px. */
  readonly height: number;
}

/** Responsive shell lifecycle, independent of document mutations. */
export interface ClassicMobileShellController {
  /** @param context - Current editor, permission and product UI authority. */
  update(context: ClassicEditorRenderContext): void;
  /** Releases viewport, touch and resize resources. */
  destroy(): void;
}
