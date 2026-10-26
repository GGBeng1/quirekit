import type { QuireDisplayCommand } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../layout";
import type { QuireDisplayListOptions } from "./types";

/**
 * Compiles projected source geometry into exact retained sub-layout chunks.
 *
 * Source roots are selected only through producer-retained layout-box ids. A
 * missing id therefore fails closed instead of assigning paint by rectangle,
 * traversal order, or an encoded identifier convention.
 *
 * @param commands - Mutable composite display command list.
 * @param node - Parent layout node carrying source roots and display chunks.
 * @param options - Display-list options carrying the exact owner collector.
 * @param paintOrder - Producer-declared order within the content lane.
 * @param appendSourceCommands - Shared compiler for the selected source roots.
 * @returns Nothing.
 */
export function appendQuireSubLayoutContentCommands(
  commands: QuireDisplayCommand[],
  node: QuireLayoutNode,
  options: QuireDisplayListOptions,
  paintOrder: number,
  appendSourceCommands: (
    commands: QuireDisplayCommand[],
    nodes: readonly QuireLayoutNode[]
  ) => void
): void {
  const sourceRootsById = new Map(
    (node.children ?? [])
      .filter((child) => child.interactionRole === "source-geometry")
      .map((child) => [child.id, child] as const)
  );

  for (const chunk of node.subLayoutDisplayChunks ?? []) {
    // Self-contained producers such as Table already own a command subtree.
    // Recompiling their source boxes would duplicate the accepted paint tree.
    if (chunk.paintRootCommandId !== undefined) {
      continue;
    }

    const sourceRoots = chunk.sourceBoxIds.flatMap((sourceBoxId) => {
      const sourceRoot = sourceRootsById.get(sourceBoxId);
      return sourceRoot === undefined ? [] : [sourceRoot];
    });
    const sourceCommands: QuireDisplayCommand[] = [];
    appendSourceCommands(sourceCommands, sourceRoots);
    if (sourceCommands.length === 0) {
      continue;
    }

    const layer = sourceCommands[0]?.layer;
    const ownerCommands: QuireDisplayCommand[] = [{
      id: `${chunk.key}:content-clip`,
      kind: "clip",
      rect: chunk.contentClip,
      commands: sourceCommands,
      ...(layer === undefined ? {} : { layer })
    }];
    commands.push(...ownerCommands);
    options.ownerCommandCollector?.append({
      productId: chunk.key,
      paintScope: "sub-layout-content",
      paintOrder,
      commands: ownerCommands
    });
  }
}
