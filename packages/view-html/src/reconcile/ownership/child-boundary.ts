import type { HtmlContainerDesc, HtmlDescriptor } from "../../descriptors";
import { HtmlDomMappingGapError } from "./mapping-gap";

/**
 * Resolves represented owners around a DOM boundary and proves semantic adjacency.
 *
 * @param container - Descriptor owning the inspected content DOM.
 * @param offset - Valid DOM child offset.
 * @param owners - Direct DOM-to-descriptor ownership map.
 * @returns Retained owners immediately before and after the DOM boundary.
 */
export function resolveHtmlChildBoundaryOwners(
  container: HtmlContainerDesc,
  offset: number,
  owners: WeakMap<Node, HtmlDescriptor>
): readonly [HtmlDescriptor | undefined, HtmlDescriptor | undefined] {
  const contentDOM = container.mount?.contentDOM;

  if (!contentDOM) {
    throw createBoundaryGap(container, offset);
  }
  const beforeNode = offset > 0 ? contentDOM.childNodes[offset - 1] : undefined;
  const afterNode = offset < contentDOM.childNodes.length
    ? contentDOM.childNodes[offset]
    : undefined;
  const before = beforeNode ? owners.get(beforeNode) : undefined;
  const after = afterNode ? owners.get(afterNode) : undefined;

  if (
    (beforeNode && before?.parent !== container) ||
    (afterNode && after?.parent !== container)
  ) {
    throw createBoundaryGap(container, offset);
  }
  const beforeIndex = before ? container.children.indexOf(before) : -1;
  const afterIndex = after ? container.children.indexOf(after) : -1;
  const adjacent = before && after
    ? afterIndex === beforeIndex + 1
    : before
      ? beforeIndex === container.children.length - 1
      : after
        ? afterIndex === 0
        : container.children.length === 0;

  if (!adjacent) {
    throw createBoundaryGap(container, offset);
  }
  return [before, after];
}

/**
 * Creates the named error for a semantically compacted DOM boundary.
 *
 * @param container - Retained container that owns the DOM boundary.
 * @param offset - DOM child offset crossing a semantic gap.
 * @returns Explicit ownership-gap error.
 */
function createBoundaryGap(
  container: HtmlContainerDesc,
  offset: number
): HtmlDomMappingGapError {
  return new HtmlDomMappingGapError(
    `DOM offset ${offset} crosses an unrepresented child of "${container.id}".`
  );
}
