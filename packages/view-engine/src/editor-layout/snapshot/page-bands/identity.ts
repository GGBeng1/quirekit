import { matchesQuireRegionOccurrence } from "../../../layout/owner-facts/region";
import { cloneQuireTextFragmentWithLazyCaretStops } from "@quirekit/layout/text";
import type { QuireLayoutRegionRef } from "@quirekit/layout/identity";
import {
  projectQuireLayoutBoxViewProductsToPage
} from "../../../layout/engine/pagination/projection/split-box/visual-instance";
import {
  projectQuireSubLayoutProjectionVisualInstance
} from "../../../layout/engine/pagination/projection/sub-layout-visual-instance";
import type {
  QuireLayoutBox,
  QuireLayoutContainer
} from "../../../layout/engine/types";
import type {
  QuireLayoutBoxSubLayoutFragment
} from "../../../layout/engine/sub-layout";

/**
 * Assigns snapshot-unique ids to one repeated story layout occurrence.
 *
 * @param layout - Translated story occurrence in document coordinates.
 * @param visualInstanceId - Stable page-local occurrence id.
 * @param pageIndex - Zero-based physical page that owns the occurrence.
 * @returns Reidentified layout tree with unchanged source ranges and ownership.
 */
export function identifyQuireStoryLayoutOccurrence(
  layout: QuireLayoutContainer,
  visualInstanceId: string,
  pageIndex: number
): QuireLayoutContainer {
  return identifyLayoutBox(
    layout,
    visualInstanceId,
    pageIndex
  ) as QuireLayoutContainer;
}

/**
 * Reidentifies one layout box and all nested paint geometry.
 *
 * @param box - Layout box belonging to a repeated source tree.
 * @param suffix - Visual-instance suffix appended to snapshot-local ids.
 * @param pageIndex - Zero-based physical page that owns the occurrence.
 * @returns Reidentified layout box.
 */
function identifyLayoutBox(
  box: QuireLayoutBox,
  suffix: string,
  pageIndex: number
): QuireLayoutBox {
  const viewProducts = projectNestedBoxViewProducts(
    box,
    suffix,
    pageIndex
  );
  const textFragments = box.textFragments?.map((fragment) =>
    cloneQuireTextFragmentWithLazyCaretStops({
      source: fragment,
      id: `${fragment.id}:${suffix}`,
      range: fragment.range,
      rect: fragment.rect,
      baseline: fragment.baseline
    })
  );
  const nodeHandle = box.nodeHandle === undefined
    ? undefined
    : { ...box.nodeHandle, id: `${box.nodeHandle.id}:${suffix}` };
  const subLayoutFragments = box.subLayoutFragments?.map((fragment) =>
    identifySubLayoutFragment(fragment, suffix)
  );
  const children = "children" in box && Array.isArray(box.children)
    ? box.children.map((child) => identifyLayoutBox(child, suffix, pageIndex))
    : undefined;

  return {
    ...box,
    ...viewProducts,
    id: `${box.id}:${suffix}`,
    ...(textFragments === undefined ? {} : { textFragments }),
    ...(nodeHandle === undefined ? {} : { nodeHandle }),
    ...(subLayoutFragments === undefined ? {} : { subLayoutFragments }),
    ...(children === undefined ? {} : { children })
  };
}

/**
 * Scopes one retained child-flow result to a repeated story occurrence.
 *
 * @param fragment - Translated child-flow fragment owned by a nested provider.
 * @param occurrenceId - Stable page-local story occurrence id.
 * @returns Fragment whose retained primary region is snapshot-unique.
 */
function identifySubLayoutFragment(
  fragment: QuireLayoutBoxSubLayoutFragment,
  occurrenceId: string
): QuireLayoutBoxSubLayoutFragment {
  const projection = fragment.subLayout;
  const scopedResultId = `${occurrenceId}:${projection.geometry.id}`;
  const scopedProjection = {
    ...projection,
    geometry: {
      ...projection.geometry,
      id: scopedResultId
    },
    view: {
      ...projection.view,
      resultId: scopedResultId
    }
  };

  return {
    ...fragment,
    subLayout: projectQuireSubLayoutProjectionVisualInstance(scopedProjection)
  };
}

/**
 * Projects one nested story box into the enclosing repeated occurrence.
 *
 * The story root is already projected by its placement authority. Nested
 * providers, such as Word tables, retain independent regions that also need
 * page-local identity while preserving their exact installed visual geometry.
 *
 * @param box - Translated layout box inside the repeated story.
 * @param occurrenceId - Stable page-local story occurrence id.
 * @param pageIndex - Zero-based physical page that owns the occurrence.
 * @returns Page-local view products, or an empty object when none are needed.
 */
function projectNestedBoxViewProducts(
  box: QuireLayoutBox,
  occurrenceId: string,
  pageIndex: number
): Pick<QuireLayoutBox, "viewRegion" | "regionProducts" | "layoutOwner"> {
  const sourceRegion = box.viewRegion;
  if (
    sourceRegion === undefined
    || sourceRegion.visualInstanceId === occurrenceId
  ) {
    return {};
  }

  const visualInstanceId = createNestedVisualInstanceId(
    occurrenceId,
    sourceRegion
  );
  const installedRect = box.regionProducts?.regions.find((region) =>
    matchesQuireRegionOccurrence(region.ref, sourceRegion)
  )?.rect ?? box.rect;

  return projectQuireLayoutBoxViewProductsToPage(
    box,
    pageIndex,
    installedRect,
    visualInstanceId
  );
}

/**
 * Creates one repeated-story occurrence id for a nested retained region.
 *
 * @param occurrenceId - Enclosing story occurrence id.
 * @param region - Nested region before repeated-story projection.
 * @returns Snapshot-unique nested visual-instance id.
 */
function createNestedVisualInstanceId(
  occurrenceId: string,
  region: QuireLayoutRegionRef
): string {
  return region.visualInstanceId === undefined
    ? occurrenceId
    : `${occurrenceId}:${region.visualInstanceId}`;
}
