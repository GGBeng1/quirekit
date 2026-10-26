import type {
  QuireLayoutBox,
  QuireLayoutContainer
} from "../../types";

/**
 * Checks whether a layout box owns child layout boxes.
 *
 * @param box - Layout box to inspect.
 * @returns Whether the box is a layout container.
 */
export function isQuireLayoutContainer(
  box: QuireLayoutBox
): box is QuireLayoutContainer {
  return "children" in box && Array.isArray(box.children);
}
