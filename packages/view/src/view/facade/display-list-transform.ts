import type { QuireDisplayList } from "@quirekit/renderer";
import type {
  QuireViewBuildOptions,
  QuireViewRenderResult
} from "../types";
import { rememberMountedSelectionPaintInputs } from "../shared/render-result/selection-update/paint-authority";
import { readMountedImageTransformPage, readMountedImageTransformPass } from "../shared/image-resource/authority";

/**
 * Applies one mounted presentation transform to every paint-bearing list.
 *
 * @param result - Canonical retained render result.
 * @param options - Current frame inputs, including any display-list transform.
 * @returns Original result or a paint-equivalent transformed copy.
 */
export function transformQuireViewRenderResultDisplayLists(
  result: QuireViewRenderResult,
  options: QuireViewBuildOptions
): QuireViewRenderResult {
  const transform = options.displayListTransform;
  if (transform === undefined) {
    rememberMountedSelectionPaintInputs(result, options);
    return result;
  }

  // One complete result lists every image the mounted pages still paint.
  const pass = readMountedImageTransformPass(transform);
  pass?.begin();
  try {
    const pageDisplayListChunks = result.pageDisplayListChunks === undefined
      ? undefined
      : transformPageDisplayListChunks(result, transform);
    const transformed = {
      ...result,
      displayList: transform(result.displayList),
      contentDisplayList: transform(result.contentDisplayList),
      overlayDisplayList: transform(result.overlayDisplayList),
      ...(pageDisplayListChunks === undefined ? {} : { pageDisplayListChunks })
    };
    rememberMountedSelectionPaintInputs(transformed, options);
    return transformed;
  } finally {
    pass?.end();
  }
}

/**
 * Transforms page-local content and overlay lists without changing identity. A mounted image
 * transform learns each chunk's page, so pages outside its demand window defer new decodes.
 *
 * @param result - Render result carrying page chunks.
 * @param transform - Display-list transform to apply.
 * @returns Reindexed transformed page chunks.
 */
function transformPageDisplayListChunks(
  result: QuireViewRenderResult,
  transform: (displayList: QuireDisplayList) => QuireDisplayList
): NonNullable<QuireViewRenderResult["pageDisplayListChunks"]> {
  const source = result.pageDisplayListChunks!;
  const transformPage = readMountedImageTransformPage(transform);
  const chunks = source.chunks.map((chunk) => ({
    ...chunk,
    contentDisplayList: transformPage?.(chunk.contentDisplayList, chunk.pageIndex) ?? transform(chunk.contentDisplayList),
    overlayDisplayList: transform(chunk.overlayDisplayList)
  }));
  return {
    chunks,
    chunksByPageIndex: Object.fromEntries(
      chunks.map((chunk) => [chunk.pageIndex, chunk])
    )
  };
}
