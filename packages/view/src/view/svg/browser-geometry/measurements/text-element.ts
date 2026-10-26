import type { QuireTextPaintCommand } from "@quirekit/renderer";
import type { SvgTextMeasurement } from "../types";
import {
  resolveSvgTextElementComputedTextLength,
  resolveSvgTextElementOffsetAtPoint,
  resolveSvgTextElementSubStringLength,
  resolveSvgTextElementXAtOffset
} from "./element-api";
import { resolveSvgTextElementRangeRects } from "./range-rects";

/** Inputs used to bind one SVG text element to its display command. */
interface CreateSvgTextElementMeasurementOptions {
  /** SVG root that owns the rendered text element. */
  readonly root: SVGSVGElement;
  /** Browser SVG text element to measure. */
  readonly element: SVGTextContentElement;
  /** Text display command that produced the element. */
  readonly command: QuireTextPaintCommand;
}

/**
 * Creates lazy browser measurement resolvers for one SVG text element.
 *
 * @param options - SVG text element, owner root, and source display command.
 * @returns Measurement object consumed by SVG refinement providers.
 */
export function createSvgTextElementMeasurement(
  options: CreateSvgTextElementMeasurementOptions
): SvgTextMeasurement {
  const { command, element, root } = options;

  return {
    root,
    command,
    resolveTextLength: () =>
      resolveSvgTextElementComputedTextLength(element),
    resolveSubStringLength: (offset, length) =>
      resolveSvgTextElementSubStringLength(element, offset, length),
    resolveXAtOffset: (offset) =>
      resolveSvgTextElementXAtOffset(element, offset),
    resolveOffsetAtPoint: (point) =>
      resolveSvgTextElementOffsetAtPoint(element, point),
    resolveRangeRects: (fromOffset, toOffset) =>
      resolveSvgTextElementRangeRects(
        element,
        command,
        fromOffset,
        toOffset
      )
  };
}
