import { createDrawingTextFitTransform } from "./fit";
import { collectAcceptedObjectRegions, readAnchoredObjectId } from "./regions";
import type { QuireLayoutRegion } from "@quirekit/layout/identity";
import {
  createQuireCenterRotationTransform,
  resolveQuirePointBounds,
  resolveQuireRectCorners,
  transformQuirePoint
} from "@quirekit/renderer";
import { translateQuireLayoutBox } from "../../../layout/engine/pagination/projection/translate";
import { projectQuireLayoutBoxViewProductsToPage } from "../../../layout/engine/pagination/projection/split-box/visual-instance";
import type {
  QuireLayoutContainer,
  QuireLayoutDocument
} from "../../../layout/engine/types";
import { identifyQuireStoryLayoutOccurrence } from "../page-bands/identity";
import type { AttachQuireWordDrawingTextInstancesOptions, QuireWordDrawingTextStorySourceLayout } from "./types";

/**
 * Attaches one translated text-story occurrence inside each accepted object.
 *
 * @param options - Accepted object products and canonical story layouts.
 * @returns Layout document with drawing-text occurrences appended after flows.
 */
export function attachQuireWordDrawingTextInstances(
  options: AttachQuireWordDrawingTextInstancesOptions
): QuireLayoutDocument {
  if (options.sources.length === 0) {
    return options.layoutDocument;
  }

  const sourceByObjectId = new Map(
    options.sources.map((source) => [source.objectId, source])
  );
  const instances: QuireLayoutContainer[] = [];
  const pagesByIndex = new Map(options.layoutDocument.pages.map(page => [page.pageIndex, page]));

  for (const region of collectAcceptedObjectRegions(options.layoutDocument)) {
    const objectId = readAnchoredObjectId(region);
    const source = objectId === null
      ? undefined
      : sourceByObjectId.get(objectId);
    if (source === undefined || region.rect === undefined) {
      continue;
    }

    instances.push(createDrawingTextInstance(
      source,
      region,
      options.layoutDocument,
      pagesByIndex
    ));
  }

  return instances.length === 0
    ? options.layoutDocument
    : {
        ...options.layoutDocument,
        children: [...options.layoutDocument.children, ...instances]
      };
}

/**
 * Creates one translated, clipped, and occurrence-specific story layout.
 *
 * @param source - Canonical story-local source layout.
 * @param region - Accepted object region in document coordinates.
 * @param document - Paginated document used to resolve page ownership.
 * @param pagesByIndex - Physical-page index shared by all visible occurrences.
 * @returns Concrete drawing-text layout occurrence.
 */
function createDrawingTextInstance(
  source: QuireWordDrawingTextStorySourceLayout,
  region: QuireLayoutRegion,
  document: QuireLayoutDocument,
  pagesByIndex: ReadonlyMap<number, QuireLayoutDocument["pages"][number]>
): QuireLayoutContainer {
  const frame = region.rect!;
  const translated = translateQuireLayoutBox(source.layout, {
    dx: frame.x + source.insets.left - source.layout.rect.x,
    dy: frame.y + source.insets.top - source.layout.rect.y
  }) as QuireLayoutContainer;
  const pageIndex = resolveRegionPageIndex(region, document);
  const paintClipRect = pageIndex === null ? undefined : pagesByIndex.get(pageIndex)?.pageRect;
  const occurrenceId = region.ref.visualInstanceId === undefined
    ? `object:${source.objectId}:drawing-text:${source.storyId}`
    : `${region.ref.visualInstanceId}:drawing-text:${source.storyId}`;
  const viewProducts = pageIndex === null
    ? {}
    : projectQuireLayoutBoxViewProductsToPage(
        source.layout,
        pageIndex,
        translated.rect,
        occurrenceId
      );
  const paintTransform = source.fitFrame === true
    ? createDrawingTextFitTransform(translated.rect, { x: frame.x + source.insets.left, y: frame.y + source.insets.top, width: source.width, height: source.height }, source.rotation, source.flipHorizontal, source.flipVertical)
    : source.rotation % 360 === 0
    ? undefined
    : createQuireCenterRotationTransform(frame, source.rotation);
  const paintBounds = paintTransform === undefined
    ? undefined
    : resolveQuirePointBounds(
        resolveQuireRectCorners(translated.rect).map((point) =>
          transformQuirePoint(point, paintTransform)
        )
      );

  return identifyQuireStoryLayoutOccurrence({
    ...translated,
    ...viewProducts,
    ...(paintClipRect === undefined ? {} : { paintClipRect }),
    ...(source.opacity === undefined || source.opacity === 1 ? {} : { paintOpacity: source.opacity }),
    ...(paintTransform === undefined
      ? {}
      : { paintTransform, paintBounds })
  }, occurrenceId, pageIndex ?? 0);
}

/**
 * Resolves the physical page that owns an accepted object occurrence.
 *
 * @param region - Accepted object region.
 * @param document - Paginated document metadata.
 * @returns Zero-based page index, or null for continuous flow.
 */
function resolveRegionPageIndex(
  region: QuireLayoutRegion,
  document: QuireLayoutDocument
): number | null {
  const visualInstanceId = region.ref.visualInstanceId;
  const match = visualInstanceId?.match(/^page:(\d+):/u);
  if (match?.[1] !== undefined) {
    return Number.parseInt(match[1], 10);
  }
  if (region.rect === undefined) {
    return null;
  }
  return document.pages.find((page) =>
    region.rect!.y >= page.pageRect.y
    && region.rect!.y < page.pageRect.y + page.pageRect.height
  )?.pageIndex ?? null;
}
