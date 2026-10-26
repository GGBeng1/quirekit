import type { QuireClipCommand } from "../core/display-list";
import { applySvgCommandOpacity, createSvgElement } from "./elements";
import { formatSvgAffineTransform } from "./affine-transform";
import { formatSvgNumber, sanitizeSvgId } from "./format";

/**
 * Creates a clipped SVG group from a clip command.
 *
 * @param document - Owner document used to create SVG nodes.
 * @param defs - Definition element receiving the clip path.
 * @param command - Clip command to convert.
 * @returns SVG group element using the generated clip path.
 */
export function createSvgClipContainer(
  document: Document,
  defs: SVGElement,
  command: QuireClipCommand
): SVGElement {
  const clipId = `clip-${sanitizeSvgId(command.id)}`;
  const clipPath = createSvgElement(document, "clipPath");
  const clipRect = createSvgElement(document, "rect");
  const group = createSvgElement(document, "g");

  clipPath.setAttribute("id", clipId);
  clipRect.setAttribute("x", formatSvgNumber(command.rect.x));
  clipRect.setAttribute("y", formatSvgNumber(command.rect.y));
  clipRect.setAttribute("width", formatSvgNumber(command.rect.width));
  clipRect.setAttribute("height", formatSvgNumber(command.rect.height));
  clipPath.append(clipRect);
  defs.append(clipPath);
  group.setAttribute("clip-path", `url(#${clipId})`);
  group.setAttribute("data-quirekit-command-id", command.id);
  if (command.transform !== undefined) {
    group.setAttribute("transform", formatSvgAffineTransform(command.transform));
  }
  applySvgCommandOpacity(group, command.opacity);

  return group;
}
