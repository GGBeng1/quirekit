import { translateQuireHitArea } from "../../core/geometry";
import type {
  QuireViewPointerEvents,
  QuireViewTarget
} from "../events";
import {
  createNodeId,
  type CompileContext
} from "./context";
import type {
  QuireCompiledViewNode,
  QuireViewNode
} from "../types";

/**
 * Appends the current node target to a compiled subtree when needed.
 *
 * @param context - Current compile context.
 * @param compiled - Compiled subtree output.
 * @returns Compiled subtree with optional current-node target.
 */
export function appendCurrentNodeTarget(
  context: CompileContext,
  compiled: QuireCompiledViewNode
): QuireCompiledViewNode {
  const target = createViewTarget(context, context.node, compiled);

  if (target === undefined) {
    return compiled;
  }

  return {
    ...compiled,
    targets: [...(compiled.targets ?? []), target]
  };
}

/**
 * Creates a target descriptor for semantic or eventful nodes.
 *
 * @param context - Current compile context.
 * @param node - Node to inspect.
 * @param compiled - Compiled output whose rect becomes the target rect.
 * @returns Target descriptor, or undefined when no target metadata exists.
 */
function createViewTarget(
  context: CompileContext,
  node: QuireViewNode,
  compiled: QuireCompiledViewNode
): QuireViewTarget | undefined {
  const range = node.range ?? context.range;
  const events = collectQuireViewNodeEvents(node);
  const hasEvents = Object.keys(events).length > 0;
  const hasInteractiveMetadata =
    node.role !== undefined ||
    node.part !== undefined ||
    node.interaction?.cursor !== undefined ||
    node.interaction?.captureCursor !== undefined ||
    node.interaction?.pointerEvents !== undefined ||
    node.interaction?.hitArea !== undefined;
  const hasMetadata = hasInteractiveMetadata || node.owner !== undefined;

  if (!hasEvents && !hasMetadata) {
    return undefined;
  }

  return {
    id: createNodeId(context, node),
    nodePath: context.path,
    rect: compiled.rect,
    ...(node.interaction?.hitArea === undefined ? {} : {
      hitArea: translateQuireHitArea(node.interaction.hitArea, compiled.rect.x, compiled.rect.y)
    }),
    ...(range === undefined ? {} : { range }),
    ...(node.role === undefined ? {} : { role: node.role }),
    ...(node.part === undefined ? {} : { part: node.part }),
    ...(node.owner === undefined ? {} : { owner: node.owner }),
    pointerEvents: resolveQuireViewNodePointerEvents(node),
    ...(node.interaction?.cursor === undefined ? {} : { cursor: node.interaction.cursor }),
    ...(node.interaction?.captureCursor === undefined
      ? {}
      : { captureCursor: node.interaction.captureCursor }),
    events
  };
}

/**
 * Resolves browser/canvas pointer participation from one neutral view node.
 *
 * DOM realization and retained hit targets must use the same rule. Otherwise
 * an eventful overlay can be reachable through retained hit testing while its
 * mounted DOM element remains physically unclickable.
 *
 * @param node - Neutral view node whose interaction metadata is authoritative.
 * @returns Pointer participation shared by targets and DOM overlays.
 */
export function resolveQuireViewNodePointerEvents(
  node: QuireViewNode
): QuireViewPointerEvents {
  if (node.interaction?.pointerEvents !== undefined) {
    return node.interaction.pointerEvents;
  }

  const hasEvents = Object.keys(collectQuireViewNodeEvents(node)).length > 0;
  const hasInteractiveMetadata =
    node.role !== undefined
    || node.part !== undefined
    || node.interaction?.cursor !== undefined
    || node.interaction?.captureCursor !== undefined;

  return hasEvents || hasInteractiveMetadata ? "auto" : "none";
}

/**
 * Collects event bindings declared through every neutral authoring shorthand.
 *
 * @param node - Neutral view node to inspect.
 * @returns Canonical event map consumed by target and pointer-policy compilation.
 */
function collectQuireViewNodeEvents(node: QuireViewNode): QuireViewTarget["events"] {
  return {
    ...(node.events ?? {}),
    ...(node.interaction?.events ?? {}),
    ...(node.onClick === undefined ? {} : { click: node.onClick })
  };
}
