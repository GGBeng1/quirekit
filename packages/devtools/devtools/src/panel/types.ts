import type { QuireDevtoolsPanelOffset } from "./mount/offset";

/** Devtools panel tool tabs. */
export type QuireDevtoolsPanelTab =
  | "document"
  | "interactions"
  | "performance"
  | "render"
  | "state";

/** Copy feedback shown after document JSON copy actions. */
export type QuireDevtoolsPanelCopyState = "copied" | "failed";

/** Options used when rendering the plain DOM devtools panel. */
export interface QuireDevtoolsPanelRenderOptions {
  /** Whether the dock body should be open. */
  readonly open?: boolean | undefined;
  /** Active tool tab. */
  readonly activeTab?: QuireDevtoolsPanelTab | undefined;
  /** Whether the dock should fill the viewport. */
  readonly fullscreen?: boolean | undefined;
  /** Expanded JSON container paths. */
  readonly jsonExpandedPaths?: readonly string[] | undefined;
  /** Expanded interaction entry ids. */
  readonly expandedInteractionIds?: readonly number[] | undefined;
  /** Expanded timeline entry ids. */
  readonly expandedTimelineEntryIds?: readonly number[] | undefined;
  /** Whether the performance timeline should show only slow entries. */
  readonly timelineSlowOnly?: boolean | undefined;
  /** Current JSON search query. */
  readonly jsonSearch?: string | undefined;
  /** Optional copy feedback state. */
  readonly copyState?: QuireDevtoolsPanelCopyState | undefined;
  /** Number of newest rows selected for recent export. */
  readonly exportTopCount?: number | undefined;
  /** Current draggable panel offset. */
  readonly panelOffset?: QuireDevtoolsPanelOffset | undefined;
}
