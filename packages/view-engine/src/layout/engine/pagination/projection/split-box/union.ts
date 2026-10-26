import { unionQuireDocumentRanges } from "@quirekit/renderer";
import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import type { QuireTableLayoutSnapshot } from "../../../table";
import type { QuirePageContentBucket } from "../content-bucket";

/**
 * Computes the document range covered by a page-local table fragment.
 *
 * @param table - Page-local table snapshot.
 * @returns Range spanned by the fragment rows and cells.
 */
export function unionQuireTableFragmentRange(
  table: QuireTableLayoutSnapshot
): QuireDocumentRange {
  const ranges = [
    ...table.rows
      .filter((row) => row.isRepeatedHeader !== true)
      .map((row) => row.range),
    ...table.cells
      .filter((cell) => cell.isRepeatedHeader !== true)
      .map((cell) => cell.range)
  ];

  return unionQuireDocumentRanges(ranges) ?? table.tableRange;
}

/**
 * Computes the document range covered by a page content bucket.
 *
 * @param bucket - Page content bucket to measure.
 * @returns Document range spanning the bucket fragments and child boxes.
 */
export function unionQuireContentRange(
  bucket: QuirePageContentBucket
): QuireDocumentRange {
  return bucket.range;
}

/**
 * Computes the bounding rectangle of a page content bucket.
 *
 * @param bucket - Page content bucket to measure.
 * @returns Bounding rectangle spanning the bucket fragments and child boxes.
 */
export function unionQuireContentRect(bucket: QuirePageContentBucket): QuireRect {
  return bucket.rect;
}
