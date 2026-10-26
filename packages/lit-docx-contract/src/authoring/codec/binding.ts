import { createDocxFallbackApi } from "../fallback.js";
import type { DocxCodecDirectionDecision } from "../types.js";

/**
 * Binds a codec-level diagnostic to concise fallback operations.
 *
 * @param context - Conversion context with a reporter-bound facade.
 * @param decision - Directional loss decision.
 * @returns Context with a fallback family carrying the default diagnostic.
 */
export function bindDefaultFallback<Context extends {
  readonly docx: {
    readonly fallback: unknown;
  };
  readonly report: Parameters<typeof createDocxFallbackApi>[0];
}>(
  context: Context,
  decision: DocxCodecDirectionDecision | undefined
): Context {
  if (decision?.diagnostic === undefined) return context;
  return {
    ...context,
    docx: Object.freeze({
      ...context.docx,
      fallback: createDocxFallbackApi(
        context.report,
        decision.diagnostic
      )
    })
  };
}
