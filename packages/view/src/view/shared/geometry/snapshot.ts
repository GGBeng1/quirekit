import type { QuireRetainedLayoutSnapshot } from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../types";

/**
 * Resolves the snapshot mounted geometry APIs should query.
 *
 * @param renderResult - Current mounted render result, when available.
 * @returns Interaction snapshot with retained render-time targets.
 */
export function resolveQuireViewInteractionGeometrySnapshot(
  renderResult: QuireViewRenderResult | undefined
): QuireRetainedLayoutSnapshot | undefined {
  return renderResult?.interactionSnapshot;
}

/**
 * Resolves the current mounted interaction snapshot or throws before first render.
 *
 * @param renderResult - Current mounted render result, when available.
 * @param methodName - Public geometry method that requested a snapshot.
 * @param viewMode - Mounted view mode used in the error message.
 * @returns Interaction snapshot with retained render-time targets.
 */
export function requireQuireViewInteractionGeometrySnapshot(
  renderResult: QuireViewRenderResult | undefined,
  methodName: string,
  viewMode: string
): QuireRetainedLayoutSnapshot {
  const snapshot = resolveQuireViewInteractionGeometrySnapshot(renderResult);

  if (!snapshot) {
    throw new RangeError(`Cannot call ${methodName} before the ${viewMode} view renders`);
  }

  return snapshot;
}
