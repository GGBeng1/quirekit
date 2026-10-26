import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireLayoutSnapshot } from "../editor-layout";
import type { QuireLayoutPage } from "../layout";
import type {
  QuireViewDisplayChunkCounters
} from "../display-ownership";
import type { QuireImePreedit } from "../layout";

/**
 * Resolves physical pages that should own page-local display chunks.
 *
 * @param snapshot - Layout snapshot produced by the Engine frame.
 * @param required - Whether page chunks are mandatory for the caller.
 * @returns Layout pages to chunk, or undefined when chunks are not requested.
 */
export function resolveQuireViewEnginePageChunkPages(
  snapshot: QuireLayoutSnapshot,
  required: boolean | undefined
): readonly QuireLayoutPage[] | undefined {
  if (snapshot.pages !== undefined && snapshot.pages.length > 0) {
    return snapshot.pages;
  }
  if (required !== true) return undefined;
  return [{
    pageIndex: 0,
    range: snapshot.root.range,
    pageRect: snapshot.documentRect,
    bodyRect: snapshot.documentRect
  }];
}

/**
 * Resolves the speculative document range occupied by IME preedit text.
 *
 * @param preedit - Optional preedit descriptor.
 * @returns Speculative range, or undefined without visible preedit.
 */
export function resolveQuireViewEngineImePreeditRange(
  preedit: QuireImePreedit | undefined
): QuireDocumentRange | undefined {
  if (preedit === undefined || preedit.text.length === 0) return undefined;
  return { from: preedit.range.from, to: preedit.range.from + preedit.text.length };
}

/**
 * Creates deterministic retained display-chunk counters.
 *
 * @param counts - Records and chunks observed during frame compilation.
 * @returns Diagnostics for page and sub-layout chunk paths.
 */
export function createQuireViewEngineDisplayChunkCounters(counts: {
  /** Page-local retained records considered. */
  readonly pageRecordCount: number;
  /** Page-local retained chunks emitted. */
  readonly pageChunkCount: number;
  /** Sub-layout-local retained records considered. */
  readonly subLayoutRecordCount: number;
  /** Sub-layout-local retained chunks emitted. */
  readonly subLayoutChunkCount: number;
}): QuireViewDisplayChunkCounters {
  return {
    page: {
      retainedRecords: counts.pageRecordCount,
      retainedChunks: counts.pageChunkCount,
      fullFallbacks: 0
    },
    subLayout: {
      retainedRecords: counts.subLayoutRecordCount,
      retainedChunks: counts.subLayoutChunkCount,
      fullFallbacks: 0
    }
  };
}
