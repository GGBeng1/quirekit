import type { QuireRect } from "@quirekit/renderer";
import type {
  QuireSelectionGeometryContext,
  QuireSelectionGeometryVisualContext
} from "./types";

/**
 * Lists visual contexts that should disambiguate selection geometry.
 *
 * @param selectionContext - Active selection geometry context.
 * @returns Endpoint visual contexts, or the single active context when no endpoints exist.
 */
export function listQuireSelectionGeometryVisualContexts(
  selectionContext?: QuireSelectionGeometryContext | undefined
): readonly QuireSelectionGeometryVisualContext[] {
  if (selectionContext === undefined) {
    return [];
  }

  if (
    selectionContext.visualContexts !== undefined &&
    selectionContext.visualContexts.length > 0
  ) {
    return selectionContext.visualContexts;
  }

  return [selectionContext];
}

/**
 * Collects retained visual-instance ids from selection geometry contexts.
 *
 * @param selectionContext - Active selection geometry context.
 * @returns Unique visual-instance ids in context order.
 */
export function collectQuireSelectionGeometryVisualInstanceIds(
  selectionContext?: QuireSelectionGeometryContext | undefined
): readonly string[] {
  return collectUniqueSelectionContextValues(
    listQuireSelectionGeometryVisualContexts(selectionContext),
    (context) =>
      context.queryOwner?.region?.visualInstanceId ??
        context.viewRegion?.visualInstanceId
  );
}

/**
 * Collects retained source-fragment ids from selection geometry contexts.
 *
 * @param selectionContext - Active selection geometry context.
 * @returns Unique source-fragment ids in context order.
 */
export function collectQuireSelectionGeometrySourceFragmentIds(
  selectionContext?: QuireSelectionGeometryContext | undefined
): readonly string[] {
  return collectUniqueSelectionContextValues(
    listQuireSelectionGeometryVisualContexts(selectionContext),
    (context) => context.queryOwner?.sourceFragmentId
  );
}

/**
 * Resolves the reference rectangle used by migration fallback matching.
 *
 * @param selectionContext - Active selection geometry context.
 * @returns Document-space reference rectangle, or undefined without a retained reference.
 */
export function resolveQuireSelectionGeometryReferenceRect(
  selectionContext?: QuireSelectionGeometryContext | undefined
): QuireRect | undefined {
  if (selectionContext?.referenceRect !== undefined) {
    return selectionContext.referenceRect;
  }

  const contexts = selectionContext?.visualContexts ?? [];

  for (let index = contexts.length - 1; index >= 0; index -= 1) {
    const referenceRect = contexts[index]?.referenceRect;

    if (referenceRect !== undefined) {
      return referenceRect;
    }
  }

  return undefined;
}

/**
 * Collects unique values from visual contexts while preserving order.
 *
 * @param contexts - Visual contexts to inspect.
 * @param getValue - Reads one optional value from a visual context.
 * @returns Unique values in first-seen order.
 */
function collectUniqueSelectionContextValues(
  contexts: readonly QuireSelectionGeometryVisualContext[],
  getValue: (context: QuireSelectionGeometryVisualContext) => string | undefined
): readonly string[] {
  const values: string[] = [];

  for (const context of contexts) {
    const value = getValue(context);

    if (value !== undefined && !values.includes(value)) {
      values.push(value);
    }
  }

  return values;
}
