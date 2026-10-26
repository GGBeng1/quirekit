import { splitQuireDisplayListLayers } from "../core/display-list";
import type { SvgSyncOptions } from "./types";
import {
  createLayerGroup,
  createSvgElement,
  setSvgGeometryAttributes
} from "./elements";
import { filterSvgSvgDisplayList, filterSvgSvgDomOverlays } from "./filter";
import { createSvgForeignObject } from "./overlays";
import { appendSvgDisplayCommands } from "./surface";

/**
 * Synchronizes a display list into a live SVG host element.
 *
 * @param options - SVG host, display list, overlays, and optional viewport filter.
 */
export function syncSvgDisplayListToSvg(options: SvgSyncOptions): void {
  const bounds = options.displayList.bounds;
  const displayList = options.displayListIsViewportScoped
    ? options.displayList
    : filterSvgSvgDisplayList(options.displayList, options.viewportRect);
  const layers = splitQuireDisplayListLayers(displayList);
  const document = options.host.ownerDocument;
  const defs = createSvgElement(document, "defs");
  const contentGroup = createLayerGroup(document, "content");
  const overlayGroup = createLayerGroup(document, "overlay");
  const domOverlayGroup = createLayerGroup(document, "dom-overlays");

  setSvgGeometryAttributes(options.host, bounds);

  appendSvgDisplayCommands(contentGroup, defs, layers.content.commands, {
    ...(options.glyphRunRenderer === undefined
      ? {}
      : { glyphRunRenderer: options.glyphRunRenderer })
  });
  appendSvgDisplayCommands(overlayGroup, defs, layers.overlay.commands, {
    ...(options.glyphRunRenderer === undefined
      ? {}
      : { glyphRunRenderer: options.glyphRunRenderer })
  });

  for (const overlay of filterSvgSvgDomOverlays(
    options.domOverlays ?? [],
    options.viewportRect
  )) {
    domOverlayGroup.append(createSvgForeignObject(document, overlay));
  }

  options.host.replaceChildren(defs, contentGroup, overlayGroup, domOverlayGroup);
}

/**
 * Synchronizes a content-only display list into a live SVG host element.
 *
 * @param options - SVG host, content display list, and optional viewport filter.
 */
export function syncSvgContentDisplayListToSvg(options: SvgSyncOptions): void {
  const bounds = options.displayList.bounds;
  const displayList = options.displayListIsViewportScoped
    ? options.displayList
    : filterSvgSvgDisplayList(options.displayList, options.viewportRect);
  const document = options.host.ownerDocument;
  const defs = createSvgElement(document, "defs");
  const contentGroup = createLayerGroup(document, "content");

  setSvgGeometryAttributes(options.host, bounds);
  appendSvgDisplayCommands(contentGroup, defs, displayList.commands, {
    ...(options.glyphRunRenderer === undefined
      ? {}
      : { glyphRunRenderer: options.glyphRunRenderer })
  });

  options.host.replaceChildren(defs, contentGroup);
}
