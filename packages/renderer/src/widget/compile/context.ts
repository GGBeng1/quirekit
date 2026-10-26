import type { QuireDisplayCommand } from "../../core/display-list";
import type { QuireDocumentRange } from "../../core/document";
import type { QuirePoint } from "../../core/geometry";
import {
  createQuireWidgetConstraints
} from "../constraints";
import type {
  QuireCompiledViewNode,
  QuireViewNode,
  QuireWidgetConstraints,
  QuireWidgetRuntimeContext,
  QuireWidgetTextMeasurer
} from "../types";

/** Callback used by recursive widget compilers. */
export type CompileNodeCallback = (context: CompileContext) => QuireCompiledViewNode;

/** Context carried through recursive widget compilation. */
export interface CompileContext {
  /** Stable root id prefix. */
  readonly id: string;
  /** Current path within the widget tree. */
  readonly path: string;
  /** Widget node currently being compiled. */
  readonly node: QuireViewNode;
  /** Origin assigned to the current widget. */
  readonly origin: QuirePoint;
  /** Constraints assigned to the current widget. */
  readonly constraints: QuireWidgetConstraints;
  /** Optional inherited document range. */
  readonly range: QuireDocumentRange | undefined;
  /** Optional inherited paint layer. */
  readonly layer: QuireDisplayCommand["layer"] | undefined;
  /** Text measurer used by text primitives. */
  readonly measureText: QuireWidgetTextMeasurer;
  /** Runtime data exposed to widget callbacks. */
  readonly runtime: QuireWidgetRuntimeContext;
}

/**
 * Creates a child compile context.
 *
 * @param parent - Parent compile context.
 * @param node - Child node.
 * @param path - Child path within the tree.
 * @param origin - Child origin.
 * @param constraints - Child constraints.
 * @returns Recursive child compile context.
 */
export function createChildContext(
  parent: CompileContext,
  node: QuireViewNode,
  path: string,
  origin: QuirePoint,
  constraints: QuireWidgetConstraints
): CompileContext {
  return {
    ...parent,
    constraints: createQuireWidgetConstraints(constraints),
    node,
    origin,
    path,
    range: node.range ?? parent.range
  };
}

/**
 * Creates a stable node id for a widget node.
 *
 * @param context - Recursive compile context.
 * @param node - Widget node.
 * @returns Stable node id.
 */
export function createNodeId(context: CompileContext, node: QuireViewNode): string {
  return node.id ?? `${context.id}:${context.path}`;
}

/**
 * Creates a stable command id for a widget node.
 *
 * @param context - Recursive compile context.
 * @param node - Widget node.
 * @param suffix - Command suffix.
 * @returns Stable command id.
 */
export function createCommandId(
  context: CompileContext,
  node: QuireViewNode,
  suffix: string
): string {
  return `${createNodeId(context, node)}:${suffix}`;
}
