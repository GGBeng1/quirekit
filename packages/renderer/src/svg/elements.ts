import { createImageColors } from "./image-color";
import { unscaleQuireTextCommand, formatQuireTextScaleTransform } from "../core/display-list/text-scale";
import type {
  QuireCaretCommand,
  QuireFillRectCommand,
  QuireGlyphRunCommand,
  QuireImageCommand,
  QuireLineCommand,
  QuirePathCommand,
  QuireTextCommand,
  QuireTextPaintCommand
} from "../core/display-list";
import type { QuireRect } from "../core/geometry";
import { svgNamespace } from "./constants";
import {
  formatSvgNumber,
  formatSvgPathData,
  formatSvgGlyphPlacements,
  formatSvgRect,
  formatSvgTextStyle
} from "./format";
import { formatSvgImageTransform } from "./image-transform";

/**
 * Creates an SVG layer group.
 *
 * @param document - Owner document used to create SVG nodes.
 * @param layer - Layer name to assign.
 * @returns SVG group element for the layer.
 */
export function createLayerGroup(document: Document, layer: string): SVGElement {
  const group = createSvgElement(document, "g");

  group.setAttribute("data-quirekit-svg-layer", layer);

  return group;
}

/**
 * Assigns root geometry attributes to an SVG host.
 *
 * @param host - SVG host element to mutate.
 * @param bounds - Display list bounds used as the SVG viewBox.
 */
export function setSvgGeometryAttributes(host: SVGSVGElement, bounds: QuireRect): void {
  host.setAttribute("xmlns", svgNamespace);
  host.setAttribute("viewBox", formatSvgRect(bounds));
  host.setAttribute("width", formatSvgNumber(bounds.width));
  host.setAttribute("height", formatSvgNumber(bounds.height));
  host.setAttribute("preserveAspectRatio", "none");
}

/**
 * Creates an SVG rect element from a rectangle-like command.
 *
 * @param document - Owner document used to create SVG nodes.
 * @param command - Rectangle-like command to convert.
 * @returns SVG rect element.
 */
export function createSvgRect(
  document: Document,
  command: QuireFillRectCommand | QuireCaretCommand
): SVGElement {
  const element = createSvgElement(document, "rect");

  element.setAttribute("x", formatSvgNumber(command.rect.x));
  element.setAttribute("y", formatSvgNumber(command.rect.y));
  element.setAttribute("width", formatSvgNumber(command.rect.width));
  element.setAttribute("height", formatSvgNumber(command.rect.height));
  element.setAttribute("fill", command.fillStyle);
  element.setAttribute("data-quirekit-command-id", command.id);
  applySvgCommandOpacity(element, command.opacity);

  return element;
}

/**
 * Creates an SVG text element from a text command.
 *
 * @param document - Owner document used to create SVG nodes.
 * @param command - Text command to convert.
 * @returns SVG text element.
 */
export function createSvgText(document: Document, command: QuireTextCommand): SVGElement {
  const element = createSvgElement(document, "text");

  applySvgTextAttributes(element, command);

  return element;
}

/**
 * Creates an SVG text fallback element from a glyph-run command.
 *
 * @param document - Owner document used to create SVG nodes.
 * @param command - Glyph-run command to convert.
 * @returns SVG text element carrying glyph placement metadata.
 */
export function createSvgGlyphRun(
  document: Document,
  command: QuireGlyphRunCommand
): SVGElement {
  const element = createSvgElement(document, "text");

  applySvgTextAttributes(element, command);
  element.setAttribute("data-quirekit-glyph-run", "true");
  element.setAttribute("data-quirekit-glyph-count", String(command.glyphs.length));
  element.setAttribute("data-quirekit-glyph-coverage", command.glyphCoverage);
  element.setAttribute("data-quirekit-glyphs", formatSvgGlyphPlacements(command.glyphs));

  return element;
}

/**
 * Creates an SVG line element from a line command.
 *
 * @param document - Owner document used to create SVG nodes.
 * @param command - Line command to convert.
 * @returns SVG line element.
 */
export function createSvgLine(document: Document, command: QuireLineCommand): SVGElement {
  const element = createSvgElement(document, "line");

  element.setAttribute("x1", formatSvgNumber(command.from.x));
  element.setAttribute("y1", formatSvgNumber(command.from.y));
  element.setAttribute("x2", formatSvgNumber(command.to.x));
  element.setAttribute("y2", formatSvgNumber(command.to.y));
  element.setAttribute("stroke", command.strokeStyle);
  element.setAttribute("stroke-width", formatSvgNumber(command.lineWidth));
  element.setAttribute("data-quirekit-command-id", command.id);
  applySvgCommandOpacity(element, command.opacity);

  if (command.lineDash !== undefined && command.lineDash.length > 0) {
    element.setAttribute("stroke-dasharray", formatSvgDashArray(command.lineDash));
  }

  if (command.lineCap !== undefined) {
    element.setAttribute("stroke-linecap", command.lineCap);
  }

  return element;
}

/**
 * Creates an SVG path element from a path command.
 *
 * @param document - Owner document used to create SVG nodes.
 * @param command - Path command to convert.
 * @returns SVG path element.
 */
export function createSvgPath(document: Document, command: QuirePathCommand): SVGElement {
  const element = createSvgElement(document, "path");

  element.setAttribute("d", formatSvgPathData(command.segments));
  element.setAttribute("fill", command.fillStyle ?? "none");
  element.setAttribute("data-quirekit-command-id", command.id);
  applySvgCommandOpacity(element, command.opacity);

  if (command.strokeStyle !== undefined) {
    element.setAttribute("stroke", command.strokeStyle);
  }

  if (command.lineWidth !== undefined) {
    element.setAttribute("stroke-width", formatSvgNumber(command.lineWidth));
  }

  if (command.lineDash !== undefined && command.lineDash.length > 0) {
    element.setAttribute("stroke-dasharray", formatSvgDashArray(command.lineDash));
  }

  return element;
}

/**
 * Formats a line dash pattern for an SVG element attribute.
 *
 * @param lineDash - Dash and gap lengths.
 * @returns SVG dash-array value.
 */
function formatSvgDashArray(lineDash: readonly number[]): string {
  return lineDash.map(formatSvgNumber).join(" ");
}

/**
 * Creates an SVG image element from an image command.
 *
 * @param document - Owner document used to create SVG nodes.
 * @param command - Image command to convert.
 * @returns SVG image element.
 */
export function createSvgImage(document: Document, command: QuireImageCommand): SVGElement {
  const element = createImageColors(document, command, command.sourceRect !== undefined && command.sourceSize !== undefined
    ? createCroppedSvgImage(document, command)
    : createCompleteSvgImage(document, command));
  const transform = formatSvgImageTransform(command);
  if (transform === undefined) {
    return element;
  }

  const group = createSvgElement(document, "g");
  group.setAttribute("transform", transform);
  group.append(element);
  return group;
}

/**
 * Creates one uncropped SVG image element.
 *
 * @param document - Owner document used to create SVG nodes.
 * @param command - Complete-source image command.
 * @returns SVG image element.
 */
function createCompleteSvgImage(
  document: Document,
  command: QuireImageCommand
): SVGElement {
  const element = createSvgElement(document, "image");
  element.setAttribute("x", formatSvgNumber(command.rect.x));
  element.setAttribute("y", formatSvgNumber(command.rect.y));
  element.setAttribute("width", formatSvgNumber(command.rect.width));
  element.setAttribute("height", formatSvgNumber(command.rect.height));
  element.setAttribute("href", command.href ?? "");
  element.setAttribute("data-quirekit-command-id", command.id);
  applySvgCommandOpacity(element, command.opacity);

  return element;
}

/**
 * Creates a cropped image inside a source-space SVG viewport.
 *
 * @param document - Owner document used to create SVG nodes.
 * @param command - Resolved cropped image command.
 * @returns Nested SVG viewport containing the complete source image.
 */
function createCroppedSvgImage(
  document: Document,
  command: QuireImageCommand
): SVGElement {
  const viewport = createSvgElement(document, "svg");
  const image = createSvgElement(document, "image");
  const sourceRect = command.sourceRect!;
  const sourceSize = command.sourceSize!;

  viewport.setAttribute("x", formatSvgNumber(command.rect.x));
  viewport.setAttribute("y", formatSvgNumber(command.rect.y));
  viewport.setAttribute("width", formatSvgNumber(command.rect.width));
  viewport.setAttribute("height", formatSvgNumber(command.rect.height));
  viewport.setAttribute("viewBox", formatSvgRect(sourceRect));
  viewport.setAttribute("preserveAspectRatio", "none");
  viewport.setAttribute("data-quirekit-command-id", command.id);
  applySvgCommandOpacity(viewport, command.opacity);

  image.setAttribute("x", "0");
  image.setAttribute("y", "0");
  image.setAttribute("width", formatSvgNumber(sourceSize.width));
  image.setAttribute("height", formatSvgNumber(sourceSize.height));
  image.setAttribute("href", command.href ?? "");
  viewport.append(image);
  return viewport;
}

/**
 * Creates an SVG element.
 *
 * @param document - Owner document used to create SVG nodes.
 * @param tagName - SVG tag name to create.
 * @returns Created SVG element.
 */
export function createSvgElement(document: Document, tagName: string): SVGElement {
  return document.createElementNS(svgNamespace, tagName) as SVGElement;
}

/**
 * Applies common SVG text attributes to a text-like element.
 *
 * @param element - SVG text element to mutate.
 * @param command - Text-like command to read.
 */
function applySvgTextAttributes(
  element: SVGElement,
  command: QuireTextPaintCommand
): void {
  const transform = formatQuireTextScaleTransform(command);
  command = unscaleQuireTextCommand(command);
  if (transform !== undefined) element.setAttribute("transform", transform);
  element.setAttribute("x", formatSvgNumber(resolveSvgTextAnchorX(command)));
  element.setAttribute("y", formatSvgNumber(command.origin.y));
  const mode = command.paintMode ?? "fill";
  element.setAttribute("fill", mode === "stroke" ? "none" : command.fillStyle);
  if (mode === "stroke" || mode === "fill-stroke") {
    element.setAttribute("stroke", command.strokeStyle ?? command.fillStyle);
    element.setAttribute("stroke-width", formatSvgNumber(command.lineWidth ?? 1));
    element.setAttribute("paint-order", "stroke fill");
  }
  element.setAttribute("style", formatSvgTextStyle(command));
  if (command.direction !== undefined) {
    element.setAttribute("direction", command.direction);
  }
  element.setAttribute("xml:space", "preserve");
  element.setAttribute("data-quirekit-command-id", command.id);
  applySvgCommandOpacity(element, command.opacity);
  element.textContent = command.text;
}

/**
 * Applies one renderer-neutral command opacity to a live SVG element.
 *
 * @param element - SVG element receiving the opacity attribute.
 * @param opacity - Optional command opacity multiplier.
 */
export function applySvgCommandOpacity(
  element: SVGElement,
  opacity: number | undefined
): void {
  if (opacity === undefined || opacity === 1) {
    return;
  }

  element.setAttribute("opacity", formatSvgNumber(Math.min(1, Math.max(0, opacity))));
}

/**
 * Resolves the SVG text anchor x coordinate for a text command.
 *
 * @param command - Text-like command to inspect.
 * @returns SVG text x coordinate.
 */
function resolveSvgTextAnchorX(command: QuireTextPaintCommand): number {
  return command.direction === "rtl"
    ? command.rect.x + command.rect.width
    : command.origin.x;
}
