import type { QuireLayoutNode } from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../src/view/types";
import { projectQuireRenderParityPaint } from "./paint";
import type { QuireRenderParityGap } from "./types";

/**
 * Projects geometry and source ranges owned by layout.
 *
 * @param result - Render result containing the retained layout snapshot.
 * @returns Stable layout authority facts.
 */
export function projectQuireRenderParityLayoutFacts(
  result: QuireViewRenderResult
): unknown {
  const snapshot = result.layoutSnapshot;
  return {
    documentRect: snapshot.documentRect,
    viewportRect: snapshot.viewportRect,
    pages: snapshot.pages?.map((page) => ({
      pageIndex: page.pageIndex,
      range: page.range,
      pageRect: page.pageRect,
      bodyRect: page.bodyRect
    })),
    root: projectLayoutNode(snapshot.root)
  };
}

/**
 * Projects query and target geometry while excluding executable event handlers.
 *
 * @param result - Render result containing interaction products.
 * @returns Stable interaction facts.
 */
export function projectQuireRenderParityInteractionFacts(
  result: QuireViewRenderResult
): unknown {
  const snapshot = result.interactionSnapshot;
  return {
    hitTargets: snapshot.hitTargets,
    interactionQueryIndex: snapshot.interactionQueryIndex,
    viewTargets: result.viewTargets.map((target) => ({
      id: target.id,
      nodePath: target.nodePath,
      rect: target.rect,
      range: target.range,
      role: target.role,
      part: target.part,
      owner: target.owner,
      pointerEvents: target.pointerEvents,
      cursor: target.cursor,
      eventNames: Object.keys(target.events).sort()
    }))
  };
}

/**
 * Projects stable retained owner identity and geometry.
 *
 * @param result - Render result containing the owner graph.
 * @returns Stable owner and ownership-gap facts.
 */
export function projectQuireRenderParityOwnershipFacts(
  result: QuireViewRenderResult
): unknown {
  return {
    owners: result.displayOwnerIndex.owners.map((owner) => ({
      key: owner.key,
      kind: owner.kind,
      productId: owner.productId,
      paintScope: owner.paintScope,
      region: owner.region,
      source: owner.source,
      capabilities: owner.capabilities,
      range: owner.range,
      rect: owner.rect,
      pageIndexes: owner.pageIndexes,
      ancestorOwnerKeys: owner.ancestorOwnerKeys,
      lanes: owner.lanes,
      dependencySignature: owner.dependencySignature
    })),
    gaps: result.displayOwnerIndex.gaps
  };
}

/**
 * Projects page-local or composite paint facts in canonical order.
 *
 * @param result - Render result containing direct paint output.
 * @param gaps - Shared gap collector.
 * @returns Stable paint facts.
 */
export function projectQuireRenderParityPaintFacts(
  result: QuireViewRenderResult,
  gaps: QuireRenderParityGap[]
): unknown {
  const pageChunks = result.pageDisplayListChunks?.chunks;
  if (pageChunks !== undefined) {
    return pageChunks.map((chunk) => {
      const content = projectQuireRenderParityPaint(
        chunk.contentDisplayList,
        `page[${chunk.pageIndex}].content`
      );
      const overlay = projectQuireRenderParityPaint(
        chunk.overlayDisplayList,
        `page[${chunk.pageIndex}].overlay`
      );
      gaps.push(...content.gaps, ...overlay.gaps);
      return {
        pageIndex: chunk.pageIndex,
        pageRect: chunk.pageRect,
        sourceOwnerKeys: chunk.sourceOwnerKeys,
        contentDirtyBounds: chunk.contentDirtyBounds,
        overlayDirtyBounds: chunk.overlayDirtyBounds,
        content: content.commands,
        overlay: overlay.commands
      };
    });
  }

  const content = projectQuireRenderParityPaint(result.contentDisplayList, "content");
  const overlay = projectQuireRenderParityPaint(result.overlayDisplayList, "overlay");
  gaps.push(...content.gaps, ...overlay.gaps);
  return { content: content.commands, overlay: overlay.commands };
}

/**
 * Projects serializable DOM-overlay facts and rejects live node ownership.
 *
 * @param result - Render result containing DOM overlays.
 * @param gaps - Shared gap collector.
 * @returns Stable DOM-overlay facts.
 */
export function projectQuireRenderParityDomOverlayFacts(
  result: QuireViewRenderResult,
  gaps: QuireRenderParityGap[]
): unknown {
  return result.domOverlays.map((overlay, index) => {
    if (overlay.node !== undefined || overlay.destroy !== undefined) {
      gaps.push({
        code: "live-dom-overlay",
        area: "dom-overlays",
        path: `domOverlays[${index}]`,
        message: "Live DOM overlay nodes and cleanup callbacks require an explicit parity adapter."
      });
    }
    return {
      id: overlay.id,
      key: overlay.key,
      range: overlay.range,
      rect: overlay.rect,
      html: overlay.html,
      ariaLabel: overlay.ariaLabel,
      role: overlay.role,
      pointerEvents: overlay.pointerEvents
    };
  });
}

/**
 * Projects one retained layout subtree without live editor state or providers.
 *
 * @param node - Layout node to project recursively.
 * @returns Stable node geometry and renderer-neutral products.
 */
function projectLayoutNode(node: QuireLayoutNode): unknown {
  return {
    id: node.id,
    kind: node.kind,
    range: node.range,
    rect: node.rect,
    inlineLayoutRect: node.inlineLayoutRect,
    interactionRole: node.interactionRole,
    layoutOwner: node.layoutOwner,
    table: node.table === undefined ? undefined : projectLayoutTable(node.table),
    subLayoutQueryProducts: node.subLayoutQueryProducts,
    subLayoutDisplayChunks: node.subLayoutDisplayChunks,
    children: node.children?.map(projectLayoutNode)
  };
}

/**
 * Projects a table snapshot, replacing runtime reflow continuations in cell content.
 *
 * @param table - Page-projected table layout snapshot.
 * @returns Table facts whose cell content holds only serializable layout inputs.
 */
function projectLayoutTable(table: NonNullable<QuireLayoutNode["table"]>): unknown {
  return {
    ...table,
    cells: table.cells.map((cell) => ({
      ...cell,
      contentChildren: cell.contentChildren.map(({ textFlowReflow, ...input }) => ({
        ...input,
        // Reflow carries closures for continuation layout; parity compares only its presence.
        textFlowReflow: textFlowReflow !== undefined
      }))
    }))
  };
}
