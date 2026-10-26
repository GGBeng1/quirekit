import type { QuireLayoutBox } from "../../types";
import {
  createQuireTableCellSourceSubLayoutProjectionMap,
  createQuireTableCellSubLayoutRootMap
} from "../../table/sub-layout";
import {
  createQuireRepeatedTableHeaderPageLeadingBand,
  createQuireRepeatedTableHeaderState
} from "../repeated-table-headers";
import {
  collectQuireTableCellRowLineSlices
} from "../table-cell";
import { createQuireTableRowMeasuredLineSlicesFromCellLineSlices } from "../table-row";
import { readQuireLayoutBoxChildren } from "./children";
import { createQuireTableCellLineSourceFragment } from "./provenance";
import type {
  QuireMeasuredSourceItemOptions,
  QuireMeasuredSourceItemSink
} from "./types";

/** Options for producing measured items from one table layout box. */
interface QuireTableRowMeasuredItemsOptions {
  /** Table layout box whose body rows should become measured items. */
  readonly box: QuireLayoutBox;
  /** Sink that appends measured items while preserving source-flow gaps. */
  readonly pushItem: QuireMeasuredSourceItemSink;
}

/**
 * Pushes measured pagination items for every row in a table layout box.
 *
 * @param options - Table box and measured-item sink.
 */
export function pushQuireTableRowMeasuredItems(
  options: QuireTableRowMeasuredItemsOptions
): void {
  const { box, pushItem } = options;
  const rows = box.table?.rows ?? [];
  const repeatedHeader = createQuireRepeatedTableHeaderState(box.table);
  const repeatedHeaderBand = repeatedHeader === undefined
    ? undefined
    : createQuireRepeatedTableHeaderPageLeadingBand(repeatedHeader);
  const repeatedHeaderRowIndexes = new Set(repeatedHeader?.rowIndexes ?? []);
  const children = readQuireLayoutBoxChildren(box);
  const cells = box.table?.cells ?? [];
  const subLayoutRootByCellId = createQuireTableCellSubLayoutRootMap({
    cells,
    children,
    parentId: box.table?.fragmentId ?? box.id,
    dependencySignaturePrefix: "measured-source-table-row"
  });
  const subLayoutProjectionByCellId = createQuireTableCellSourceSubLayoutProjectionMap({
    subLayoutRootByCellId
  });

  for (const row of rows) {
    const itemOptions: QuireMeasuredSourceItemOptions = repeatedHeaderRowIndexes.has(row.rowIndex)
      ? {}
      : (repeatedHeaderBand === undefined ? {} : { pageLeadingBand: repeatedHeaderBand });

    if (row.cantSplit) {
      pushItem(
        `${box.id}:row:${row.rowIndex}`,
        row.range,
        row.rect.y,
        row.rect.y + row.rect.height,
        itemOptions
      );
      continue;
    }

    const cellLineSlices = collectQuireTableCellRowLineSlices({
      row,
      cells,
      subLayoutProjectionByCellId
    });
    const slices = createQuireTableRowMeasuredLineSlicesFromCellLineSlices(
      row,
      cellLineSlices
    );

    if (slices.length === 0) {
      pushItem(
        `${box.id}:row:${row.rowIndex}`,
        row.range,
        row.rect.y,
        row.rect.y + row.rect.height,
        itemOptions
      );
      continue;
    }

    const group = `${box.id}:row:${row.rowIndex}`;
    slices.forEach((slice, sliceIndex) => {
      pushItem(
        `${group}:line:${sliceIndex}`,
        slice.range,
        slice.top,
        slice.bottom,
        {
          ...itemOptions,
          group,
          sourceFragments: slice.cellLineSlices.map(
            createQuireTableCellLineSourceFragment
          )
        }
      );
    });
  }
}
