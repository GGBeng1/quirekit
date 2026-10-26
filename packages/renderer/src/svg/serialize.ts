import { serializeImageColors } from "./image-color";
import { unscaleQuireTextCommand, formatQuireTextScaleTransform } from "../core/display-list/text-scale";
import type {
  QuireCaretCommand,
  QuireClipCommand,
  QuireDisplayCommand,
  QuireFillRectCommand,
  QuireGlyphRunCommand,
  QuireImageCommand,
  QuireLineCommand,
  QuirePathCommand,
  QuireTextCommand
} from "../core/display-list";
import type { QuireRect } from "../core/geometry";
import type { QuireLayoutDomOverlay } from "../core/overlay";
import type { SvgSerializeOptions } from "./types";
import { svgNamespace, xhtmlNamespace } from "./constants";
import { filterSvgSvgDisplayList, filterSvgSvgDomOverlays } from "./filter";
import {
  escapeSvgAttribute,
  escapeSvgText,
  formatSvgNumber,
  formatSvgPathData,
  formatSvgGlyphPlacements,
  formatSvgRect,
  formatSvgTextStyle,
  indentSvg,
  sanitizeSvgId
} from "./format";
import { formatSvgImageTransform } from "./image-transform";
import { formatSvgAffineTransform } from "./affine-transform";

/**
 * Serializes a renderer-agnostic display list into deterministic SVG markup.
 *
 * @param options - Display list serialization options.
 * @returns SVG markup that represents the display list in paint order.
 */
export function serializeSvgDisplayListToSvg(
  options: SvgSerializeOptions
): string {
  const bounds = options.displayList.bounds;
  const displayList = filterSvgSvgDisplayList(options.displayList, options.viewportRect);
  const lines = [
    `<svg xmlns="${svgNamespace}" viewBox="${formatSvgRect(bounds)}" width="${formatSvgNumber(bounds.width)}" height="${formatSvgNumber(bounds.height)}" preserveAspectRatio="none">`,
    ...displayList.commands.flatMap((command) => serializeDisplayCommand(command, 2)),
    ...serializeDomOverlays(options.domOverlays ?? [], options.viewportRect, 2),
    "</svg>"
  ];

  return lines.join("\n");
}

/**
 * Serializes one display command into an SVG element.
 *
 * @param command - Display command to serialize.
 * @param indent - Number of spaces used to indent output lines.
 * @returns SVG element markup for the command.
 */
function serializeDisplayCommand(
  command: QuireDisplayCommand,
  indent: number
): string[] {
  switch (command.kind) {
    case "fill-rect":
    case "caret":
      return [indentSvg(serializeRectCommand(command), indent)];
    case "text":
      return [indentSvg(serializeTextCommand(command), indent)];
    case "glyph-run":
      return [indentSvg(serializeGlyphRunCommand(command), indent)];
    case "line":
      return [indentSvg(serializeLineCommand(command), indent)];
    case "path":
      return [indentSvg(serializePathCommand(command), indent)];
    case "image":
      return [indentSvg(serializeImageCommand(command), indent)];
    case "clip":
      return serializeClipCommand(command, indent);
  }
}

/**
 * Serializes a rectangle-like display command into an SVG rect element.
 *
 * @param command - Fill rectangle or caret command to serialize.
 * @returns SVG rect element markup.
 */
function serializeRectCommand(command: QuireFillRectCommand | QuireCaretCommand): string {
  return `<rect x="${formatSvgNumber(command.rect.x)}" y="${formatSvgNumber(command.rect.y)}" width="${formatSvgNumber(command.rect.width)}" height="${formatSvgNumber(command.rect.height)}" fill="${escapeSvgAttribute(command.fillStyle)}"${formatSvgOpacityAttribute(command)} />`;
}

/**
 * Serializes a text display command into an SVG text element.
 *
 * @param command - Text command to serialize.
 * @returns SVG text element markup.
 */
function serializeTextCommand(command: QuireTextCommand): string {
  return `<text ${formatSvgTextAttributes(command)}>${escapeSvgText(command.text)}</text>`;
}

/**
 * Serializes a glyph-run display command into an SVG text fallback element.
 *
 * @param command - Glyph-run command to serialize.
 * @returns SVG text element markup with glyph placement metadata.
 */
function serializeGlyphRunCommand(command: QuireGlyphRunCommand): string {
  const glyphs = escapeSvgAttribute(formatSvgGlyphPlacements(command.glyphs));

  return `<text ${formatSvgTextAttributes(command)} data-quirekit-glyph-run="true" data-quirekit-glyph-count="${command.glyphs.length}" data-quirekit-glyph-coverage="${command.glyphCoverage}" data-quirekit-glyphs="${glyphs}">${escapeSvgText(command.text)}</text>`;
}

/**
 * Formats shared SVG text attributes for text-like commands.
 *
 * @param command - Text-like command to serialize.
 * @returns Serialized attribute string.
 */
function formatSvgTextAttributes(command: QuireTextCommand | QuireGlyphRunCommand): string {
  const transform = formatQuireTextScaleTransform(command);
  command = unscaleQuireTextCommand(command);
  const mode = command.paintMode ?? "fill";
  const attributes = [
    ...(transform === undefined ? [] : [`transform="${escapeSvgAttribute(transform)}"`]),
    `x="${formatSvgNumber(resolveSvgTextAnchorX(command))}"`,
    `y="${formatSvgNumber(command.origin.y)}"`,
    `fill="${escapeSvgAttribute(mode === "stroke" ? "none" : command.fillStyle)}"`,
    `style="${escapeSvgAttribute(formatSvgTextStyle(command))}"`
  ];

  if (mode === "stroke" || mode === "fill-stroke") {
    attributes.push(
      `stroke="${escapeSvgAttribute(command.strokeStyle ?? command.fillStyle)}"`,
      `stroke-width="${formatSvgNumber(command.lineWidth ?? 1)}"`,
      "paint-order=\"stroke fill\""
    );
  }

  if (command.direction !== undefined) {
    attributes.push(`direction="${command.direction}"`);
  }

  attributes.push("xml:space=\"preserve\"");
  appendSvgOpacityAttribute(attributes, command);

  return attributes.join(" ");
}

/**
 * Resolves the SVG text anchor x coordinate for a text command.
 *
 * @param command - Text-like command to inspect.
 * @returns SVG text x coordinate.
 */
function resolveSvgTextAnchorX(command: QuireTextCommand | QuireGlyphRunCommand): number {
  return command.direction === "rtl"
    ? command.rect.x + command.rect.width
    : command.origin.x;
}

/**
 * Serializes a line display command into an SVG line element.
 *
 * @param command - Line command to serialize.
 * @returns SVG line element markup.
 */
function serializeLineCommand(command: QuireLineCommand): string {
  const attributes = [
    `x1="${formatSvgNumber(command.from.x)}"`,
    `y1="${formatSvgNumber(command.from.y)}"`,
    `x2="${formatSvgNumber(command.to.x)}"`,
    `y2="${formatSvgNumber(command.to.y)}"`,
    `stroke="${escapeSvgAttribute(command.strokeStyle)}"`,
    `stroke-width="${formatSvgNumber(command.lineWidth)}"`
  ];

  if (command.lineDash !== undefined && command.lineDash.length > 0) {
    attributes.push(`stroke-dasharray="${formatSvgDashArray(command.lineDash)}"`);
  }

  if (command.lineCap !== undefined) {
    attributes.push(`stroke-linecap="${command.lineCap}"`);
  }
  appendSvgOpacityAttribute(attributes, command);

  return `<line ${attributes.join(" ")} />`;
}

/**
 * Serializes a path display command into an SVG path element.
 *
 * @param command - Path command to serialize.
 * @returns SVG path element markup.
 */
function serializePathCommand(command: QuirePathCommand): string {
  const attributes = [
    `d="${escapeSvgAttribute(formatSvgPathData(command.segments))}"`,
    `fill="${escapeSvgAttribute(command.fillStyle ?? "none")}"`
  ];

  if (command.strokeStyle !== undefined) {
    attributes.push(`stroke="${escapeSvgAttribute(command.strokeStyle)}"`);
  }

  if (command.lineWidth !== undefined) {
    attributes.push(`stroke-width="${formatSvgNumber(command.lineWidth)}"`);
  }
  if (command.lineDash !== undefined && command.lineDash.length > 0) {
    attributes.push(`stroke-dasharray="${formatSvgDashArray(command.lineDash)}"`);
  }
  appendSvgOpacityAttribute(attributes, command);

  return `<path ${attributes.join(" ")} />`;
}

/**
 * Serializes an image display command into an SVG image element.
 *
 * @param command - Image command to serialize.
 * @returns SVG image element markup.
 */
function serializeImageCommand(command: QuireImageCommand): string {
  const transform = formatSvgImageTransform(command);
  const markup = serializeImageColors(command, serializeUntransformedImageCommand(command));
  return transform === undefined
    ? markup
    : `<g transform="${transform}">${markup}</g>`;
}

/**
 * Serializes image and crop geometry before destination transformation.
 *
 * @param command - Image command to serialize.
 * @returns SVG image or nested viewport markup.
 */
function serializeUntransformedImageCommand(command: QuireImageCommand): string {
  if (command.sourceRect !== undefined && command.sourceSize !== undefined) {
    const attributes = [
      `x="${formatSvgNumber(command.rect.x)}"`,
      `y="${formatSvgNumber(command.rect.y)}"`,
      `width="${formatSvgNumber(command.rect.width)}"`,
      `height="${formatSvgNumber(command.rect.height)}"`,
      `viewBox="${formatSvgRect(command.sourceRect)}"`,
      "preserveAspectRatio=\"none\""
    ];
    appendSvgOpacityAttribute(attributes, command);
    return `<svg ${attributes.join(" ")}><image x="0" y="0" width="${formatSvgNumber(command.sourceSize.width)}" height="${formatSvgNumber(command.sourceSize.height)}" href="${escapeSvgAttribute(command.href ?? "")}" /></svg>`;
  }
  return `<image x="${formatSvgNumber(command.rect.x)}" y="${formatSvgNumber(command.rect.y)}" width="${formatSvgNumber(command.rect.width)}" height="${formatSvgNumber(command.rect.height)}" href="${escapeSvgAttribute(command.href ?? "")}"${formatSvgOpacityAttribute(command)} />`;
}

/**
 * Appends a normalized opacity attribute to one mutable SVG attribute list.
 *
 * @param attributes - Serialized attributes being assembled.
 * @param command - Display command carrying optional transient opacity.
 */
function appendSvgOpacityAttribute(
  attributes: string[],
  command: QuireDisplayCommand
): void {
  if (command.opacity === undefined || command.opacity === 1) {
    return;
  }

  attributes.push(`opacity="${formatSvgNumber(normalizeSvgOpacity(command.opacity))}"`);
}

/**
 * Formats one optional command opacity as a leading serialized attribute.
 *
 * @param command - Display command carrying optional transient opacity.
 * @returns Empty text for full opacity, otherwise a leading opacity attribute.
 */
function formatSvgOpacityAttribute(command: QuireDisplayCommand): string {
  return command.opacity === undefined || command.opacity === 1
    ? ""
    : ` opacity="${formatSvgNumber(normalizeSvgOpacity(command.opacity))}"`;
}

/**
 * Clamps one renderer-neutral opacity to the SVG-supported interval.
 *
 * @param opacity - Raw command opacity.
 * @returns Opacity normalized to the inclusive zero-to-one interval.
 */
function normalizeSvgOpacity(opacity: number): number {
  return Math.min(1, Math.max(0, opacity));
}

/**
 * Formats a line dash pattern for SVG output.
 *
 * @param lineDash - Dash and gap lengths.
 * @returns SVG dash-array value.
 */
function formatSvgDashArray(lineDash: readonly number[]): string {
  return lineDash.map(formatSvgNumber).join(" ");
}

/**
 * Serializes a clipped display command group into SVG clipPath and group markup.
 *
 * @param command - Clip command to serialize.
 * @param indent - Number of spaces used to indent the group.
 * @returns SVG markup lines for the clip path and clipped children.
 */
function serializeClipCommand(command: QuireClipCommand, indent: number): string[] {
  const clipId = `clip-${sanitizeSvgId(command.id)}`;
  const transform = command.transform === undefined
    ? ""
    : ` transform="${formatSvgAffineTransform(command.transform)}"`;

  return [
    indentSvg(
      `<clipPath id="${escapeSvgAttribute(clipId)}"><rect x="${formatSvgNumber(command.rect.x)}" y="${formatSvgNumber(command.rect.y)}" width="${formatSvgNumber(command.rect.width)}" height="${formatSvgNumber(command.rect.height)}" /></clipPath>`,
      indent
    ),
    indentSvg(`<g clip-path="url(#${escapeSvgAttribute(clipId)})"${transform}${formatSvgOpacityAttribute(command)}>`, indent),
    ...command.commands.flatMap((child) => serializeDisplayCommand(child, indent + 2)),
    indentSvg("</g>", indent)
  ];
}

/**
 * Serializes DOM overlays as SVG foreignObject markup.
 *
 * @param overlays - DOM overlays to serialize.
 * @param viewportRect - Optional viewport rectangle used to filter overlays.
 * @param indent - Number of spaces used to indent output lines.
 * @returns SVG foreignObject markup lines.
 */
function serializeDomOverlays(
  overlays: readonly QuireLayoutDomOverlay[],
  viewportRect: QuireRect | undefined,
  indent: number
): string[] {
  return filterSvgSvgDomOverlays(overlays, viewportRect).map((overlay) =>
    indentSvg(
      `<foreignObject x="${formatSvgNumber(overlay.rect.x)}" y="${formatSvgNumber(overlay.rect.y)}" width="${formatSvgNumber(overlay.rect.width)}" height="${formatSvgNumber(overlay.rect.height)}"${overlay.role === undefined ? "" : ` role="${escapeSvgAttribute(overlay.role)}"`}${overlay.ariaLabel === undefined ? "" : ` aria-label="${escapeSvgAttribute(overlay.ariaLabel)}"`}${overlay.pointerEvents === undefined ? "" : ` pointer-events="${overlay.pointerEvents}"`}><div xmlns="${xhtmlNamespace}" data-quirekit-overlay-id="${escapeSvgAttribute(overlay.id)}"${formatSerializedOverlayRangeAttributes(overlay)}>${overlay.html ?? ""}</div></foreignObject>`,
      indent
    )
  );
}

/**
 * Formats optional document range attributes for a serialized overlay.
 *
 * @param overlay - Overlay whose range attributes should be formatted.
 * @returns Serialized range attributes, or an empty string when absent.
 */
function formatSerializedOverlayRangeAttributes(overlay: QuireLayoutDomOverlay): string {
  if (overlay.range === undefined) {
    return "";
  }

  return ` data-quirekit-range-from="${formatSvgNumber(overlay.range.from)}" data-quirekit-range-to="${formatSvgNumber(overlay.range.to)}"`;
}
