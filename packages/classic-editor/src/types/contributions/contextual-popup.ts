import type { ClassicEditorIconName } from "../../icons";
import type { ClassicEditorBehavior } from "../behaviors";
import type { ClassicEditorText } from "../base";
import type { ClassicEditorRenderContext } from "../context";
import type { ClassicEditorContributionBase } from "./base";

/** Normalized occurrence that opens one target-owned contextual Popup Menu. */
export interface ClassicEditorContextualPopupTrigger {
  /** Trigger discriminator. */
  readonly kind: "contextual-popup";
  /** Stable semantic target shared by the popup owner and contributed items. */
  readonly target: string;
  /** Exact document position owned by the contextual target. */
  readonly position: number;
  /** Optional target-owned immutable facts used by item predicates or payloads. */
  readonly detail?: unknown;
}

/** Action-backed icon item composed inside a target-owned contextual Popup Menu. */
export interface ClassicEditorContextualPopupItemContribution
  extends ClassicEditorContributionBase {
  /** Contribution discriminator. */
  readonly kind: "contextual-popup-item";
  /** Stable semantic popup target that accepts this item. */
  readonly target: string;
  /** Bundled product icon rendered by the public Popup Menu item. */
  readonly icon: ClassicEditorIconName;
  /** Localized accessible label and default tooltip. */
  readonly label: ClassicEditorText;
  /** Optional localized tooltip override. */
  readonly title?: ClassicEditorText | undefined;
  /** Typed behavior executed directly by this item. */
  readonly behavior: ClassicEditorBehavior;
  /**
   * Resolves an behavior payload from one exact contextual target.
   *
   * @param trigger - Normalized contextual popup occurrence.
   * @param context - Latest mounted product context.
   * @returns Payload passed to the typed product behavior.
   */
  readonly payload?: ((
    trigger: ClassicEditorContextualPopupTrigger,
    context: ClassicEditorRenderContext
  ) => unknown) | undefined;
  /**
   * Reports whether the item applies to one exact target occurrence.
   *
   * @param trigger - Normalized contextual popup occurrence.
   * @param context - Latest mounted product context.
   * @returns Whether the popup owner should include the item.
   */
  readonly whenTrigger?: ((
    trigger: ClassicEditorContextualPopupTrigger,
    context: ClassicEditorRenderContext
  ) => boolean) | undefined;
}
