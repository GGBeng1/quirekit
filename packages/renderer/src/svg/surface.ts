import { unscaleQuireTextCommand, formatQuireTextScaleTransform } from "../core/display-list/text-scale";
import type { QuireDisplayCommand } from "../core/display-list";
import { paintQuireDisplayCommand } from "../core/paint";
import type { QuireDrawSurface } from "../core";
import type { SvgDrawSurfaceOptions } from "./types";
import { createSvgClipContainer } from "./clip";
import {
  applySvgCommandOpacity,
  createSvgElement,
  createSvgGlyphRun,
  createSvgImage,
  createSvgLine,
  createSvgPath,
  createSvgRect,
  createSvgText
} from "./elements";

/**
 * Creates a draw surface that appends SVG elements to a parent node.
 *
 * @param options - SVG parent and optional defs element.
 * @returns SVG-backed draw surface.
 */
export function createSvgSvgDrawSurface(
  options: SvgDrawSurfaceOptions
): QuireDrawSurface {
  const defs = options.defs ?? createSvgElement(options.parent.ownerDocument, "defs");
  const parentStack: SVGElement[] = [options.parent];

  /**
   * Reads the current SVG parent for draw calls.
   *
   * @returns SVG element receiving the next draw command.
   */
  const currentParent = (): SVGElement => parentStack[parentStack.length - 1] ?? options.parent;

  return {
    fillRect(command): void {
      currentParent().append(createSvgRect(options.parent.ownerDocument, command));
    },
    fillText(command): void {
      currentParent().append(createSvgText(options.parent.ownerDocument, command));
    },
    fillGlyphRun(command): void {
      const customNodes = options.glyphRunRenderer?.renderGlyphRun(unscaleQuireTextCommand(command), {
        document: options.parent.ownerDocument,
        defs
      });

      if (customNodes) {
        const nodes = asSvgNodeArray(customNodes);
        for (const node of nodes) {
          applySvgCommandOpacity(node, command.opacity);
        }
        const transform = formatQuireTextScaleTransform(command);
        if (transform === undefined) currentParent().append(...nodes);
        else {
          const group = createSvgElement(options.parent.ownerDocument, "g");
          group.setAttribute("transform", transform);
          group.append(...nodes);
          currentParent().append(group);
        }
        return;
      }

      currentParent().append(createSvgGlyphRun(options.parent.ownerDocument, command));
    },
    strokeLine(command): void {
      currentParent().append(createSvgLine(options.parent.ownerDocument, command));
    },
    drawPath(command): void {
      currentParent().append(createSvgPath(options.parent.ownerDocument, command));
    },
    drawImage(command): void {
      currentParent().append(createSvgImage(options.parent.ownerDocument, command));
    },
    withClip(command, draw): void {
      const group = createSvgClipContainer(options.parent.ownerDocument, defs, command);

      currentParent().append(group);
      parentStack.push(group);
      draw();
      parentStack.pop();
    }
  };
}

/**
 * Appends display commands to an SVG parent while reusing one draw surface.
 *
 * @param parent - Parent element receiving command nodes.
 * @param defs - Definition element receiving clip paths.
 * @param commands - Display commands to append.
 */
export function appendSvgDisplayCommands(
  parent: SVGElement,
  defs: SVGElement,
  commands: readonly QuireDisplayCommand[],
  options: Pick<SvgDrawSurfaceOptions, "glyphRunRenderer"> = {}
): void {
  const surface = createSvgSvgDrawSurface({
    parent,
    defs,
    ...(options.glyphRunRenderer === undefined
      ? {}
      : { glyphRunRenderer: options.glyphRunRenderer })
  });

  for (const command of commands) {
    paintQuireDisplayCommand(surface, command);
  }
}

/**
 * Normalizes one or many SVG nodes for append calls.
 *
 * @param nodes - Custom SVG node or nodes returned by a glyph-run renderer.
 * @returns Node array safe to spread into append.
 */
function asSvgNodeArray(nodes: SVGElement | readonly SVGElement[]): SVGElement[] {
  if (Array.isArray(nodes)) {
    return [...nodes];
  }

  return [nodes as SVGElement];
}
