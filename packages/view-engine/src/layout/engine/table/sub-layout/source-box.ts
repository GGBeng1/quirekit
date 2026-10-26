import type { QuireLayoutBox } from "../../types";

/**
 * Creates a lookup for table-cell sub-layout source boxes keyed by layout box id.
 *
 * @param children - Source layout boxes that may contain table-cell child flows.
 * @returns Layout boxes keyed by their stable ids.
 */
export function createQuireTableCellLayoutBoxLookup(
  children: readonly QuireLayoutBox[]
): ReadonlyMap<string, QuireLayoutBox> {
  const childById = new Map<string, QuireLayoutBox>();

  for (const child of children) {
    collectQuireTableCellLayoutBoxTreeInto(child, childById);
  }

  return childById;
}

/**
 * Collects one table-cell child flow box and its descendants in source order.
 *
 * @param box - Source layout box tree to collect.
 * @returns Flattened layout box tree including the root box.
 */
export function collectQuireTableCellLayoutBoxTree(
  box: QuireLayoutBox
): readonly QuireLayoutBox[] {
  const boxes: QuireLayoutBox[] = [];

  pushQuireTableCellLayoutBoxTree(box, boxes);

  return boxes;
}

/**
 * Recursively indexes layout boxes by id without replacing earlier owners.
 *
 * @param box - Layout box subtree to inspect.
 * @param childById - Mutable lookup receiving boxes by stable id.
 */
function collectQuireTableCellLayoutBoxTreeInto(
  box: QuireLayoutBox,
  childById: Map<string, QuireLayoutBox>
): void {
  if (!childById.has(box.id)) {
    childById.set(box.id, box);
  }

  if (!hasQuireTableCellLayoutBoxChildren(box)) {
    return;
  }

  for (const child of box.children) {
    collectQuireTableCellLayoutBoxTreeInto(child, childById);
  }
}

/**
 * Recursively appends a layout box tree in source order.
 *
 * @param box - Layout box subtree to append.
 * @param boxes - Mutable output receiving the box tree.
 */
function pushQuireTableCellLayoutBoxTree(
  box: QuireLayoutBox,
  boxes: QuireLayoutBox[]
): void {
  boxes.push(box);

  if (!hasQuireTableCellLayoutBoxChildren(box)) {
    return;
  }

  for (const child of box.children) {
    pushQuireTableCellLayoutBoxTree(child, boxes);
  }
}

/**
 * Checks whether a layout box owns child boxes.
 *
 * @param box - Layout box to inspect.
 * @returns Whether the box is a measured-source container.
 */
function hasQuireTableCellLayoutBoxChildren(
  box: QuireLayoutBox
): box is QuireLayoutBox & { readonly children: readonly QuireLayoutBox[] } {
  return Array.isArray((box as { readonly children?: unknown }).children);
}
