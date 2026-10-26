import { normalizeQuirePositiveAreaRects } from "@quirekit/renderer";
import type { QuireLayoutDocument } from "../types";
import { traceQuireLayoutPhase } from "../trace";
import { prepareQuireLayoutDocumentPagination } from "./prepare";
import { projectQuireLayoutDocumentToPages } from "./projection";
import type { QuireLayoutDocumentPaginationOptions } from "./types";

/**
 * Paginates an infinite-flow document and projects it into page-body coordinates.
 *
 * This compatibility entry keeps clips scoped to both page source-context
 * collection and page projection. Runtime owners needing arbitrary later windows
 * prepare without clips and retain that unprojected result separately.
 *
 * @param options - Layout document, page geometry, and optional projection window.
 * @returns Page-projected layout document with all page geometry attached.
 */
export function paginateQuireLayoutDocument(
  options: QuireLayoutDocumentPaginationOptions
): QuireLayoutDocument {
  const projectionClipRects = normalizeQuirePositiveAreaRects(options.projectionClipRects);
  const document = prepareQuireLayoutDocumentPagination({ ...options, projectionClipRects });
  return traceQuireLayoutPhase(options.trace, "layout:paginate:project", () =>
    projectQuireLayoutDocumentToPages({
      document,
      sourceFlowX: options.document.rect.x,
      ...(projectionClipRects === undefined ? {} : { projectionClipRects }),
      ...(options.trace === undefined ? {} : { trace: options.trace })
    }));
}
