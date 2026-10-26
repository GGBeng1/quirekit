import { createQuireWidgetConstraints } from "./constraints";
import { compileBoxNode } from "./compile/nodes/box";
import { compileCustomPaintNode } from "./compile/nodes/custom-paint";
import { compileDividerNode } from "./compile/nodes/divider";
import { compileDomOverlayNode } from "./compile/nodes/dom-overlay";
import { compileFlexNode } from "./compile/nodes/flex";
import { compileOverlayNode } from "./compile/nodes/overlay";
import { compileParagraphPreviewNode } from "./compile/nodes/paragraph-preview";
import { compilePositionedNode } from "./compile/nodes/positioned";
import { compileSpacerNode } from "./compile/nodes/spacer";
import { compileSurfaceNode } from "./compile/nodes/surface";
import { compileTextNode } from "./compile/nodes/text";
import {
  compileClipNode,
  compilePaddingNode
} from "./compile/wrapper";
import type { CompileContext } from "./compile/context";
import { appendCurrentNodeTarget } from "./compile/target";
import { defaultMeasureText } from "./sizing";
import type {
  QuireCompiledViewNode,
  QuireViewCompileOptions,
  QuireViewCompileResult
} from "./types";

/**
 * Compiles a renderer-neutral widget tree into display-list output.
 *
 * @param options - Widget tree, origin, constraints, and inherited render metadata.
 * @returns Display-list output and DOM overlays emitted by the widget tree.
 */
export function compileQuireViewNode(
  options: QuireViewCompileOptions
): QuireViewCompileResult {
  const compiled = compileNode({
    constraints: createQuireWidgetConstraints(options.constraints),
    id: options.id,
    layer: options.layer,
    measureText: options.measureText ?? defaultMeasureText,
    node: options.node,
    origin: options.origin,
    path: "0",
    range: options.range,
    runtime: {
      host: options.host
    }
  });

  return {
    rect: compiled.rect,
    displayList: {
      bounds: compiled.rect,
      commands: compiled.commands
    },
    domOverlays: compiled.domOverlays,
    targets: compiled.targets ?? []
  };
}

/**
 * Dispatches one widget node to its focused compiler module.
 *
 * @param context - Recursive compile context.
 * @returns Display output for the node subtree.
 */
function compileNode(context: CompileContext): QuireCompiledViewNode {
  const compiled = compileNodeBody(context);

  return appendCurrentNodeTarget(context, compiled);
}

/**
 * Dispatches one widget node to its focused compiler module without target wrapping.
 *
 * @param context - Recursive compile context.
 * @returns Display output for the node subtree.
 */
function compileNodeBody(context: CompileContext): QuireCompiledViewNode {
  switch (context.node.kind) {
    case "box":
      return compileBoxNode(context, context.node);
    case "text":
      return compileTextNode(context, context.node);
    case "paragraph-preview":
      return compileParagraphPreviewNode(context, context.node);
    case "flex":
      return compileFlexNode(context, context.node, compileNode);
    case "surface":
      return compileSurfaceNode(context, context.node, compileNode);
    case "overlay":
      return compileOverlayNode(context, context.node, compileNode);
    case "positioned":
      return compilePositionedNode(context, context.node, compileNode);
    case "padding":
      return compilePaddingNode(context, context.node, compileNode);
    case "clip":
      return compileClipNode(context, context.node, compileNode);
    case "spacer":
      return compileSpacerNode(context, context.node);
    case "divider":
      return compileDividerNode(context, context.node);
    case "custom-paint":
      return compileCustomPaintNode(context, context.node);
    case "dom-overlay":
      return compileDomOverlayNode(context, context.node);
  }
}
