import type {
  ClassicEditorContribution,
  ClassicEditorRenderContext
} from "../../types";
import { resolveClassicEditorContributionBehavior } from "./utils";
import { isClassicEditorPresentationActionAvailable } from "../../runtime/ui/presentation/actions";
import { readClassicEditorPresentationValue } from "../../runtime/ui/presentation/scope";
import { selectContributions } from "./utils";

const visibilityKey = Symbol("contribution-visibility");
const visibleListKey = Symbol("visible-contribution-list");
const visibleKindKey = Symbol("visible-contribution-kind");

/**
 * Reports whether one contribution applies to the mounted product assembly.
 *
 * Static feature filtering already happened in the registry. This second phase
 * evaluates mounted capability and product-context conditions without mutating
 * plugin declarations.
 *
 * @param contribution - Registry contribution to evaluate.
 * @param context - Latest mounted product context.
 * @returns Whether the contribution may be presented.
 */
export function isClassicEditorContributionVisible(
  contribution: ClassicEditorContribution,
  context: ClassicEditorRenderContext
): boolean {
  return readClassicEditorPresentationValue(context, [visibilityKey, contribution],
    () => readContributionVisibility(contribution, context));
}

/**
 * Evaluates only the predicates needed to include one contribution.
 * @param contribution - Immutable registered contribution.
 * @param context - Current presentation epoch.
 * @returns Whether this contribution can be presented.
 */
function readContributionVisibility(
  contribution: ClassicEditorContribution,
  context: ClassicEditorRenderContext
): boolean {
  if (contribution.when?.(context) === false) return false;
  if (contribution.kind === "document-service") {
    const service = context.instance.registry.services.get(contribution.service);
    return contribution.operation === "import"
      ? service?.import !== undefined
      : service?.export !== undefined;
  }
  if ("action" in contribution) {
    return isClassicEditorPresentationActionAvailable(
      contribution.action,
      context,
      undefined,
      contribution.kind === "block-type" || contribution.kind === "insert-item"
        ? "menu"
        : contribution.kind === "selection-popup-item"
        ? "selection-popup"
        : contribution.kind === "ribbon-action-control"
          ? "ribbon"
          : "toolbar"
    );
  }
  if (!("behavior" in contribution)) return true;
  const behavior = resolveClassicEditorContributionBehavior(contribution);
  return context.instance.isContributionAvailable(behavior);
}

/**
 * Selects currently visible contributions without modifying the registry array.
 *
 * @param contributions - Static feature-filtered registry contributions.
 * @param context - Latest mounted product context.
 * @returns Readonly visible contributions shared within a known presentation epoch.
 */
export function filterVisibleClassicEditorContributions(
  contributions: readonly ClassicEditorContribution[],
  context: ClassicEditorRenderContext
): readonly ClassicEditorContribution[] {
  return readClassicEditorPresentationValue(context, [visibleListKey, contributions],
    () => Object.freeze(contributions.filter((contribution) =>
      isClassicEditorContributionVisible(contribution, context)
    )));
}

/**
 * Selects a family without evaluating unrelated contribution predicates.
 * @param contributions - Immutable registry directory.
 * @param context - Current presentation epoch.
 * @param kind - Contribution family consumed by this surface.
 * @returns Readonly visible family in declaration order.
 */
export function selectVisibleClassicEditorContributions<Kind extends ClassicEditorContribution["kind"]>(
  contributions: readonly ClassicEditorContribution[],
  context: ClassicEditorRenderContext,
  kind: Kind
): readonly Extract<ClassicEditorContribution, { readonly kind: Kind }>[] {
  return readClassicEditorPresentationValue(context, [visibleKindKey, contributions, kind],
    () => Object.freeze(selectContributions(contributions, kind).filter(contribution =>
      isClassicEditorContributionVisible(contribution, context))));
}
