import type { QuireImageCommand } from "../core/display-list";
import { escapeSvgAttribute, formatSvgNumber } from "./format";
import { svgNamespace } from "./constants";

/** @param command - Image identity and channel transform. @returns Collision-free filter fragment id. */
function filterId(command: QuireImageCommand): string {
  return `quire-image-color-${Array.from(command.id).map(char => char.codePointAt(0)!.toString(16)).join("-")}`;
}

/** @param command - Image command. @param markup - Untransformed image. @returns Filtered image markup. */
export function serializeImageColors(command: QuireImageCommand, markup: string): string {
  const effect = command.colorAdjustment;
  if (!effect) return markup;
  const id = escapeSvgAttribute(filterId(command));
  return `<g><defs><filter id="${id}" color-interpolation-filters="sRGB"><feComponentTransfer>${["R", "G", "B"].map(channel =>
    `<feFunc${channel} type="linear" slope="${formatSvgNumber(effect.slope)}" intercept="${formatSvgNumber(effect.intercept)}"/>`).join("")}</feComponentTransfer></filter></defs><g filter="url(#${id})">${markup}</g></g>`;
}

/** @param document - SVG owner. @param command - Image command. @param image - Untransformed image. @returns Image with source-color filtering. */
export function createImageColors(document: Document, command: QuireImageCommand, image: SVGElement): SVGElement {
  if (!command.colorAdjustment) return image;
  const group = document.createElementNS(svgNamespace, "g");
  const defs = document.createElementNS(svgNamespace, "defs");
  const filter = document.createElementNS(svgNamespace, "filter");
  filter.setAttribute("id", filterId(command));
  filter.setAttribute("color-interpolation-filters", "sRGB");
  const transfer = document.createElementNS(svgNamespace, "feComponentTransfer");
  for (const channel of ["R", "G", "B"]) {
    const component = document.createElementNS(svgNamespace, `feFunc${channel}`);
    component.setAttribute("type", "linear");
    component.setAttribute("slope", formatSvgNumber(command.colorAdjustment.slope));
    component.setAttribute("intercept", formatSvgNumber(command.colorAdjustment.intercept));
    transfer.append(component);
  }
  filter.append(transfer); defs.append(filter);
  const filtered = document.createElementNS(svgNamespace, "g");
  filtered.setAttribute("filter", `url(#${filterId(command)})`); filtered.append(image);
  group.append(defs, filtered);
  return group;
}
