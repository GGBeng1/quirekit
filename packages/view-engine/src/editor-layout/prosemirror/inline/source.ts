import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireInlineSourceAnchor, QuireInlineTextRun } from "@quirekit/layout/inline";
import type {
  QuireInlineSourceCapabilityRegistry,
  QuireInlineSourceCapabilityResolverResult,
  QuireInlineSourceCapabilitySidecar,
  QuireInlineSourceTextStyle
} from "../../../layout/engine/inline/source-capability";
import type { CollectedInlineSourceProduct } from "./types";

/**
 * Creates a measured atomic run when a claimed drawing participates inline.
 *
 * @param product - Logical source and its optional claimed capability.
 * @param from - Absolute source start position.
 * @param to - Absolute source end position.
 * @param font - Inherited font used only for baseline-compatible metadata.
 * @param marks - Mark names attached to the inline source.
 * @param color - Optional inherited glyph color.
 * @returns Atomic replacement run, or undefined for anchored/unclaimed sources.
 */
export function createInlineReplacementRun(
  product: CollectedInlineSourceProduct,
  from: number,
  to: number,
  font: string,
  marks: readonly string[],
  color?: string
): QuireInlineTextRun | undefined {
  const capability = product.capability;
  if (capability?.status !== "resolved" || capability.placement.layoutMode !== "inline") {
    return undefined;
  }

  return {
    text: "\ufffc",
    range: { from, to },
    font,
    ...(color === undefined ? {} : { color }),
    marks,
    replacement: {
      sourceAnchorId: product.anchor.id,
      inlineSize: capability.placement.extent.inlineSize,
      blockSize: capability.placement.extent.blockSize,
      ...(capability.placement.extent.baselineOffset === undefined
        ? {}
        : { baselineOffset: capability.placement.extent.baselineOffset })
    }
  };
}

/**
 * Creates one exact logical source anchor from a direct inline child.
 *
 * @param child - Non-text inline child represented by the anchor.
 * @param offset - Child offset relative to the textblock content.
 * @param contentStart - Absolute start of the textblock content.
 * @param contentEnd - Absolute end of the textblock content.
 * @param sourceId - Stable identity of the owning textblock.
 * @param sourceCapabilityRegistry - Internal exact-node capability registry.
 * @param textStyle - Optional resolved typography for a text-like inline source.
 * @returns Canonical source anchor and optional claimed View capability sidecar.
 */
export function createInlineSourceProduct(
  child: ProseMirrorNode,
  offset: number,
  contentStart: number,
  contentEnd: number,
  sourceId: string,
  sourceCapabilityRegistry?: QuireInlineSourceCapabilityRegistry,
  textStyle?: QuireInlineSourceTextStyle
): CollectedInlineSourceProduct {
  const from = contentStart + offset;
  const to = from + child.nodeSize;
  if (to > contentEnd) {
    throw new RangeError(
      `Inline child ${child.type.name} exceeds textblock content range.`
    );
  }

  const anchor: QuireInlineSourceAnchor = {
    id: `${sourceId}:inline-source:${offset}:${child.type.name}`,
    nodeType: child.type.name,
    range: { from, to },
    position: { pos: from, bias: 1 },
    affinity: "before"
  };
  const capability = sourceCapabilityRegistry?.resolve({
    nodeType: child.type.name,
    sourceAnchorId: anchor.id,
    position: from,
    attrs: child.attrs as Readonly<Record<string, unknown>>,
    ...(textStyle === undefined ? {} : { textStyle })
  });

  return capability === undefined
    ? { anchor }
    : { anchor, capability: createInlineSourceSidecar(anchor.id, anchor.nodeType, capability) };
}

/**
 * Pairs one resolver result with its logical source anchor.
 *
 * @param sourceAnchorId - Logical source anchor identity.
 * @param nodeType - Exact claimed node type.
 * @param capability - Resolver result.
 * @returns View capability sidecar keyed by the anchor.
 */
export function createInlineSourceSidecar(
  sourceAnchorId: string,
  nodeType: string,
  capability: QuireInlineSourceCapabilityResolverResult
): QuireInlineSourceCapabilitySidecar {
  return capability.status === "gap"
    ? { sourceAnchorId, nodeType, status: "gap", gaps: capability.gaps }
    : { sourceAnchorId, nodeType, status: "resolved", placement: capability.placement, presentation: capability.presentation };
}
