import type { EditorSelection, SelectionRange, Text } from "@quirekit/cm-state";

/** Actual layout work performed by the navigation owner, accumulated over the editor lifetime. */
export interface NavigationWork {
  /** Accepted target geometry reads, excluding cancelled callbacks. */
  navigationMeasurements: number;
  /** Accepted native corrections after asynchronous geometry changes. */
  navigationCorrections: number;
}

/** Explicit source navigation; native CM still owns scrolling and selection. */
export interface NavigationRequest {
  /** Canonical source range to keep visible. */
  readonly range: SelectionRange;
  /** Public scrollTo aligns to the start; search uses minimal scrolling. */
  readonly y: "nearest" | "start";
  /** Whether changing the current search query retires this intent. */
  readonly search: boolean;
}

/** Snapshot guarding a pending geometry correction against newer user intent. */
export interface NavigationAnchor extends NavigationRequest {
  /** Accepted source identity; edits cancel, rather than retargeting an old search. */
  readonly doc: Text;
  /** Selection when navigation began; subsequent selection changes cancel it. */
  readonly selection: EditorSelection;
}
