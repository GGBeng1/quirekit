import type { FakeSvgMountElement } from "./element";

/**
 * Reads a deterministic display rectangle for mounted SVG tests.
 *
 * @param element - Fake SVG element to inspect.
 * @returns DOMRect-like surface rectangle.
 */
export function getFakeSvgBoundingClientRect(element: FakeSvgMountElement): DOMRect {
  const width = Number(element.attributes.width ?? 0);
  const height = Number(element.attributes.height ?? 0);

  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({})
  } as DOMRect;
}
