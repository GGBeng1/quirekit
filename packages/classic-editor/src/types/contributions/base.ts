import type { ClassicEditorRenderContext } from "../context";
import type { ClassicEditorAudience } from "../ui";

/** Shared fields carried by every product contribution. */
export interface ClassicEditorContributionBase {
  /** Stable contribution id, unique across the product registry. */
  readonly id: string;
  /** Surface audience, further restricted by the owning plugin audience. */
  readonly audience?: ClassicEditorAudience | undefined;
  /** Optional feature that must be enabled before this contribution is visible. */
  readonly feature?: string | undefined;
  /** Stable ascending display order. */
  readonly order?: number | undefined;
  /**
   * Reports whether the contribution applies to the current mounted product.
   *
   * @param context - Latest mounted product context.
   * @returns Whether the contribution may be considered for presentation.
   */
  readonly when?: ((context: ClassicEditorRenderContext) => boolean) | undefined;
}
