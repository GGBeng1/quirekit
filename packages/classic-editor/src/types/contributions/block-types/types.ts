import type { QuireJSONContent } from "@quirekit/core";
import type { ClassicEditorText } from "../../base";
import type { ClassicEditorActionDefinition } from "../action-catalog";
import type { ClassicEditorRenderContext } from "../../context";
import type { ClassicEditorContributionBase } from "../base";

/** Feature-owned block preset shared by conversion and insertion menus. */
export interface ClassicEditorBlockTypeContribution extends ClassicEditorContributionBase {
  /** Block preset discriminator. */
  readonly kind: "block-type";
  /** Localized type name. */
  readonly label: ClassicEditorText;
  /** Public UI icon identifier. */
  readonly icon: string;
  /** Converts the complete selected blocks through their semantic owner. */
  readonly action: ClassicEditorActionDefinition;
  /**
   * Creates an empty block with the same semantics as conversion.
   * @param context - Current document registry and product capabilities.
   * @returns Insertion content, or null when the preset is unavailable.
   */
  readonly createContent: (context: ClassicEditorRenderContext) => QuireJSONContent | null;
}
