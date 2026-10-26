import type {
  ClassicEditorGlobalSettingsSectionContribution,
  ClassicEditorRenderContext
} from "../../../types";

/** Reactive state owned by the built-in global-settings panel root. */
export interface ClassicEditorGlobalSettingsPanelState {
  /** Latest mounted product context. */
  context: ClassicEditorRenderContext;
  /** Visible extension sections in deterministic contribution order. */
  sections: readonly ClassicEditorGlobalSettingsSectionContribution[];
}

/** Reactive state passed to one extension-owned global-settings section. */
export interface ClassicEditorGlobalSettingsSectionState {
  /** Latest mounted product context. */
  context: ClassicEditorRenderContext;
}
