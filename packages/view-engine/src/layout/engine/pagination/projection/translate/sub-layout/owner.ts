import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type { QuireLayoutTranslation } from "../../types";

/**
 * Translates retained query-owner diagnostics when a product is page projected.
 *
 * @param owner - Query-product owner facts to translate.
 * @param projection - Page-body projection to apply.
 * @returns Query-product owner with a projected coordinate path.
 */
export function translateQuireLayoutQueryProductOwner(
  owner: QuireLayoutQueryProductOwner,
  projection: QuireLayoutTranslation
): QuireLayoutQueryProductOwner {
  return owner.coordinatePath === undefined
    ? owner
    : {
        ...owner,
        coordinatePath: {
          ...owner.coordinatePath,
          steps: owner.coordinatePath.steps.map((step, index, steps) =>
            index === steps.length - 1
              ? {
                  ...step,
                  output: {
                    ...step.output,
                    x: step.output.x + projection.dx,
                    y: step.output.y + projection.dy
                  }
                }
              : step
          )
        }
      };
}
