import type {
  ClassicEditorActionRibbonControlContribution,
  ClassicEditorCommandGroupPriority,
  ClassicEditorText
} from "../../../types";

/** Direct-action-only group rendered by the rebuilt Command Strip. */
export interface ResolvedClassicEditorCommandStripGroup {
  /** Stable contribution or consumer-composition id. */
  readonly id: string;
  /** Task tab that owns the group. */
  readonly tabId: string;
  /** Localized group label. */
  readonly label: ClassicEditorText;
  /** Width-budget priority. */
  readonly priority: ClassicEditorCommandGroupPriority;
  /** Ordered direct typed actions; legacy behaviors and widgets never enter this list. */
  readonly items: readonly ClassicEditorActionRibbonControlContribution[];
}

/** One measured Command Strip group or task tab. */
export interface ClassicEditorCommandStripMeasurement {
  /** Stable resolved id. */
  readonly id: string;
  /** Rendered inline size in CSS pixels. */
  readonly width: number;
}

/** Width-budget result used by direct and overflow group projections. */
export interface ClassicEditorCommandStripBudget {
  /** Groups retained in the direct Command Strip, in source order. */
  readonly visibleIds: readonly string[];
  /** Groups moved into the discoverable overflow, in source order. */
  readonly overflowIds: readonly string[];
}

/** Width-budget result for the 36-pixel task-tab row. */
export interface ClassicEditorTaskTabBudget {
  /** Tabs retained directly in the tablist. */
  readonly visibleIds: readonly string[];
  /** Tabs reachable through the adjacent task overflow menu. */
  readonly overflowIds: readonly string[];
}
