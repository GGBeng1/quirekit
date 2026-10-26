import type { ClassicEditorText } from "../base";
import type { ClassicEditorBehavior } from "../behaviors";
import type { ClassicEditorRenderContext } from "../context";
import type { ClassicEditorContributionBase } from "./base";

/** One action item resolved inside a product popmenu. */
export interface ClassicEditorPopmenuItem {
  /** Stable item id within the owning popmenu contribution. */
  readonly id: string;
  /** Localized item label rendered by the product component runtime. */
  readonly label: ClassicEditorText;
  /** Typed behavior executed directly when the item is selected. */
  readonly behavior: ClassicEditorBehavior;
  /** Optional localized feedback shown when an enabled action cannot complete. */
  readonly failureMessage?: ClassicEditorText | undefined;
  /**
   * Resolves the behavior payload from the semantic trigger detail.
   *
   * @param detail - Trigger-specific event detail.
   * @param context - Latest mounted product context.
   * @returns Payload forwarded to the product behavior.
   */
  readonly payload?: ((
    detail: unknown,
    context: ClassicEditorRenderContext
  ) => unknown) | undefined;
  /**
   * Reports whether the item applies to the current semantic trigger.
   *
   * @param detail - Trigger-specific event detail.
   * @param context - Latest mounted product context.
   * @returns Whether the item should be rendered.
   */
  readonly when?: ((
    detail: unknown,
    context: ClassicEditorRenderContext
  ) => boolean) | undefined;
}

/** Product popmenu dynamically opened by a semantic mounted-View event. */
export interface ClassicEditorPopmenuContribution extends ClassicEditorContributionBase {
  /** Contribution discriminator. */
  readonly kind: "popmenu";
  /** Bubbling DOM event emitted from a mounted View action. */
  readonly eventType: string;
  /**
   * Resolves menu items for one trigger occurrence.
   *
   * @param detail - Semantic event detail emitted by the capability extension.
   * @param context - Latest mounted product context.
   * @returns Immutable menu items in presentation order.
   */
  items(
    detail: unknown,
    context: ClassicEditorRenderContext
  ): readonly ClassicEditorPopmenuItem[];
}
