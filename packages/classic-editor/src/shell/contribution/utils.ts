import type {
  ClassicEditorBehavior,
  ClassicEditorActionDefinition,
  ClassicEditorActionState,
  ClassicEditorContribution,
  ClassicEditorRenderable,
  ClassicEditorRenderContext
} from "../../types";
import {
  executeClassicEditorAction
} from "../../runtime/ui";
import { resolveClassicEditorPresentationActionState } from "../../runtime/ui/presentation/actions";
import { readClassicEditorContributionFamily } from "./directory";

/**
 * Selects contributions by discriminator with a narrowed result type.
 *
 * @param contributions - All visible product contributions.
 * @param kind - Contribution discriminator.
 * @returns Contributions of the requested kind.
 */
export function selectContributions<Kind extends ClassicEditorContribution["kind"]>(
  contributions: readonly ClassicEditorContribution[],
  kind: Kind
): readonly Extract<ClassicEditorContribution, { readonly kind: Kind }>[] {
  return readClassicEditorContributionFamily(contributions, kind);
}

/**
 * Resolves direct action state when a new contribution owns the action itself.
 *
 * @param contribution - Direct action contribution.
 * @param context - Mounted product render context.
 * @param payload - Surface-owned payload.
 * @param source - Invoking surface.
 * @param detail - Optional normalized trigger detail.
 * @returns Current immutable direct-action state.
 */
export function resolveClassicEditorContributionActionState(
  contribution: { readonly action: ClassicEditorActionDefinition },
  context: ClassicEditorRenderContext,
  payload: unknown,
  source: "toolbar" | "ribbon" | "context-menu" | "selection-popup",
  detail?: unknown
): ClassicEditorActionState {
  return resolveClassicEditorPresentationActionState(
    contribution.action,
    context,
    payload,
    source,
    detail
  );
}

/**
 * Executes a direct typed contribution action without using legacy behavior dispatch.
 *
 * @param contribution - Direct action contribution.
 * @param context - Mounted product render context.
 * @param payload - Surface-owned payload.
 * @param source - Invoking surface.
 * @param detail - Optional normalized trigger detail.
 * @returns Whether the action handled the request.
 */
export function executeClassicEditorContributionAction(
  contribution: { readonly action: ClassicEditorActionDefinition },
  context: ClassicEditorRenderContext,
  payload: unknown,
  source: "toolbar" | "ribbon" | "context-menu" | "selection-popup",
  detail?: unknown
): Promise<boolean> {
  return executeClassicEditorAction(contribution.action, context, payload, source, detail);
}

/** Contribution shape that directly owns its typed product behavior. */
export interface ClassicEditorExecutableContribution {
  /** Direct typed behavior executed by the contribution runtime. */
  readonly behavior: ClassicEditorBehavior;
}

/**
 * Resolves the direct typed behavior retained by one contribution.
 *
 * @param contribution - Executable product contribution.
 * @returns Direct typed behavior.
 */
export function resolveClassicEditorContributionBehavior(
  contribution: ClassicEditorExecutableContribution
): ClassicEditorBehavior {
  return contribution.behavior;
}

/**
 * Appends a contribution render value without accepting raw HTML.
 *
 * @param host - Contribution body host.
 * @param value - DOM node, text, or null.
 */
export function appendRenderedValue(
  host: HTMLElement,
  value: ClassicEditorRenderable
): void {
  if (isMountedRenderable(value)) {
    appendRenderedValue(host, value.element);
    return;
  }
  if (typeof value === "string") host.append(value);
  else if (value) host.append(value);
}

/**
 * Detects contribution content that owns an explicit mounted lifecycle.
 *
 * @param value - Candidate render value.
 * @returns Whether the value supplies DOM content and teardown.
 */
export function isMountedRenderable(
  value: ClassicEditorRenderable
): value is Extract<ClassicEditorRenderable, { readonly destroy: () => void }> {
  return value !== null
    && typeof value === "object"
    && "element" in value
    && "destroy" in value
    && typeof value.destroy === "function";
}
