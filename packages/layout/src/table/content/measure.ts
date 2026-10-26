import type { QuireBlockFlowInput } from "../../block-flow";
import type {
  MeasureQuireTableCellBlockFlowOptions,
  QuireTableCellBlockFlowLayout
} from "./types";

/**
 * Measures recursive block flow inside one resolved table-cell content box.
 *
 * Table geometry owns the final content width. This phase resolves exactly one
 * child authority at that width and delegates recursive flow through the active
 * block-flow consumer, so ordinary body and table-cell layout share the same
 * specialization semantics without importing View providers into Layout.
 *
 * @param options - Cell identity, geometry, content authority, and flow service.
 * @returns Measured height together with the exact child inputs used.
 */
export function measureQuireTableCellBlockFlow<
  Input extends QuireBlockFlowInput
>(
  options: MeasureQuireTableCellBlockFlowOptions<Input>
): QuireTableCellBlockFlowLayout<Input> {
  const children = options.content?.collectChildren === undefined
    ? options.content?.children ?? []
    : options.content.collectChildren({ contentRect: options.contentRect });
  const measured = options.layoutContainer({
    id: `${options.cellId}:measure`,
    range: options.range,
    rect: options.contentRect,
    blockHeight: options.blockHeight,
    blockGap: 0,
    children
  });

  return {
    height: measured.rect.height,
    children
  };
}
