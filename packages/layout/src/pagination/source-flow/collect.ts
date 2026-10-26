import type { QuirePageFragment } from "../types";
import type { QuireSourceFlowPageBand } from "./types";

/** @param pages - Complete unprojected pagination. @returns Sorted source-flow bands including each column. */
export function collectQuireSourceFlowPageBands(pages: readonly QuirePageFragment[]): readonly QuireSourceFlowPageBand[] {
  return pages.flatMap((page, pageIndex) => (page.columns ?? [page]).flatMap(band =>
    band.sourceFlowY === undefined || band.sourceFlowHeight === undefined ? []
      : [{ from: band.sourceFlowY, to: band.sourceFlowY + band.sourceFlowHeight, pageIndex }])).sort((a, b) => a.from - b.from);
}
