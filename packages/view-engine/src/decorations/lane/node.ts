import type { Decoration, DecorationAttrs } from "@quirekit/pm";
import {
  findQuireDecorationNodeFragments,
  findQuireDecorationTableGeometries,
  type QuireDecorationNodeGeometry,
  type QuireDecorationTableGeometryKind
} from "../geometry";
import type {
  QuireDecorationLaneOptions,
  QuireDecorationNodeVisual,
  QuireResolvedDecorationStyle
} from "../types";

/** Inputs used to map a node decoration into renderer-neutral lanes. */
export interface NodeDecorationLaneInput {
  /** Lane build options containing the layout snapshot. */
  readonly options: QuireDecorationLaneOptions;
  /** Source ProseMirror node decoration. */
  readonly decoration: Decoration;
  /** Stable decoration id. */
  readonly decorationId: string;
  /** Source decoration attributes. */
  readonly attrs: DecorationAttrs;
  /** Resolved paint style. */
  readonly style: QuireResolvedDecorationStyle;
  /** Mutable node visual lane sink. */
  readonly nodes: QuireDecorationNodeVisual[];
}

/**
 * Appends a node decoration visual.
 *
 * @param input - Node decoration mapping inputs.
 */
export function appendNodeDecorationLane(input: NodeDecorationLaneInput): void {
  const range = {
    from: input.decoration.from,
    to: input.decoration.to
  };
  const tableGeometryKind = readTableGeometryKind(input.attrs);
  const geometries: readonly QuireDecorationNodeGeometry[] =
    tableGeometryKind === null
      ? findQuireDecorationNodeFragments(input.options.snapshot, range)
      : findQuireDecorationTableGeometries(
          input.options.snapshot,
          range,
          tableGeometryKind
        );

  for (const geometry of geometries) {
    input.nodes.push({
      id: `${input.decorationId}:node:${geometry.id}`,
      decorationId: input.decorationId,
      range: geometry.range,
      rect: geometry.rect,
      attrs: input.attrs,
      ...(input.style.background === undefined
        ? {}
        : { background: input.style.background }),
      ...(input.style.outline === undefined
        ? {}
        : { outline: input.style.outline })
    });
  }
}

/**
 * Reads an optional retained Table geometry request from decoration attrs.
 *
 * @param attrs - Node-decoration attributes.
 * @returns Supported Table carrier kind, or null.
 */
function readTableGeometryKind(
  attrs: DecorationAttrs
): QuireDecorationTableGeometryKind | null {
  const value = attrs["data-qk-decoration-node-geometry"];
  return value === "table-row" || value === "table-cell" ? value : null;
}
