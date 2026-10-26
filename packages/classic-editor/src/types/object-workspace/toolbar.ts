import type { MaybeRefOrGetter } from "vue";
import type { QuireKitToolbarRow } from "@quirekit/ui";
import type { ClassicEditorToolbarContribution, ClassicEditorToolbarContributionState } from "../contributions/toolbar";
import type { ClassicEditorObjectWorkspaceController, ClassicEditorObjectWorkspaceLayout, ClassicEditorObjectWorkspaceSnapshot } from "./controller";

/** Live inputs for a retained object Toolbar configuration. */
export interface ClassicEditorObjectToolbarState extends ClassicEditorToolbarContributionState {
  /** Shared exact-target action and Inspector owner. */
  readonly controller: ClassicEditorObjectWorkspaceController;
  /** Current immutable target and capability revision. */
  readonly snapshot: ClassicEditorObjectWorkspaceSnapshot;
  /** Root-local responsive layout. */
  readonly layout: ClassicEditorObjectWorkspaceLayout;
}

/** Public Toolbar configuration with semantic rows, not nested toolbars. */
export interface ClassicEditorObjectToolbarContribution extends ClassicEditorToolbarContribution {
  /** Accessible label for the complete toolbar. */
  readonly label: MaybeRefOrGetter<string>;
  /** Public multirow controls; each row remains a surface-free group. */
  readonly rows: MaybeRefOrGetter<readonly QuireKitToolbarRow[]>;
}

/**
 * Creates a retained configuration in the object's Vue lifecycle.
 * @param state - Live context with an exact-target commit guard.
 * @returns Rows and public control renderers owned by the contributing feature.
 */
export type ClassicEditorObjectToolbarFactory = (state: ClassicEditorObjectToolbarState) => ClassicEditorObjectToolbarContribution;
