import type { BlockSlotRef } from "@quirekit/extensions";
import type { ClassicEditorInsertItemDefinition } from "../insert";
import type { ClassicEditorContributionBase } from "./base";
import type { ClassicEditorToolbarContributionFactory } from "./toolbar";

/** Captured destination shared by a picker and its eventual semantic commit. */
export interface ClassicEditorBlockInsertionTarget {
  /** Stable revision-bound outside boundary. */
  readonly destination: BlockSlotRef;
  /** Plus on an empty paragraph may consume that placeholder. */
  readonly replaceEmpty?: boolean;
}

/** Feature-owned Insert definition also available beside document blocks. */
export interface ClassicEditorInsertItemContribution extends ClassicEditorContributionBase, ClassicEditorInsertItemDefinition {
  /** Explicit discovery channel independent of Ribbon visibility. */
  readonly kind: "insert-item";
  /** Direct action shown with paragraph presets in the compact grid. */
  readonly quick?: boolean;
  /** Existing feature picker, retaining its canonical action and payload validation. */
  readonly toolbar?: ClassicEditorToolbarContributionFactory;
  /** Theme semantic icon emphasis for content rows. */
  readonly color?: "primary" | "info" | "success" | "warning";
}
