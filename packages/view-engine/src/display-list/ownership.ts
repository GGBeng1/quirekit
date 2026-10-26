import type { QuireDisplayCommand } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../layout";
import type { QuireDisplayListOptions } from "./types";

/** Stable shape shared by decoration background and node visuals. */
interface QuireAnnotationCommandVisual {
  /** Stable source decoration id used as retained product identity. */
  readonly decorationId: string;
}

/**
 * Appends one layout node's persistent commands to its direct owner bucket.
 *
 * @param commands - Mutable composite display command list.
 * @param node - Layout node owning the persistent commands.
 * @param options - Display-list options carrying an optional owner collector.
 * @param append - Callback emitting commands into the node-local buffer.
 * @param paintOrder - Optional retained-lane order for non-body content.
 * @returns Nothing.
 */
export function appendQuireOwnedContentCommands(
  commands: QuireDisplayCommand[],
  node: QuireLayoutNode,
  options: QuireDisplayListOptions,
  append: (commands: QuireDisplayCommand[]) => void,
  paintOrder = 100,
  opacity?: number | undefined
): void {
  const ownerCommands: QuireDisplayCommand[] = [];
  append(ownerCommands);
  const presentedCommands = applyQuireDisplayCommandOpacity(ownerCommands, opacity);
  commands.push(...presentedCommands);
  options.ownerCommandCollector?.append({
    productId: node.id,
    paintScope: "layout-content",
    paintOrder,
    commands: presentedCommands
  });
}

/**
 * Applies one transient opacity multiplier to a directly owned command batch.
 *
 * Top-level clip opacity naturally affects every child, so the batch keeps one
 * retained command per original producer instead of rewriting nested commands.
 *
 * @param commands - Directly owned command batch.
 * @param opacity - Optional presentation opacity assigned by the content phase.
 * @returns Original commands at full opacity or a presented immutable copy.
 */
export function applyQuireDisplayCommandOpacity(
  commands: readonly QuireDisplayCommand[],
  opacity: number | undefined
): readonly QuireDisplayCommand[] {
  if (opacity === undefined || opacity === 1) {
    return commands;
  }

  const normalizedOpacity = Math.min(1, Math.max(0, opacity));
  return commands.map((command) => ({
    ...command,
    opacity: (command.opacity ?? 1) * normalizedOpacity
  } as QuireDisplayCommand));
}

/**
 * Appends document or page chrome into its shared cross-page owner.
 *
 * @param commands - Mutable composite display command list.
 * @param options - Display-list options carrying an optional owner collector.
 * @param paintOrder - Producer-declared order within the content lane.
 * @param append - Callback emitting one page-chrome command batch.
 * @returns Nothing.
 */
export function appendQuireOwnedPageChromeCommands(
  commands: QuireDisplayCommand[],
  options: QuireDisplayListOptions,
  paintOrder: number,
  append: (commands: QuireDisplayCommand[]) => void
): void {
  appendOwnerCommands(
    commands,
    options,
    "page-chrome",
    "page-chrome",
    paintOrder,
    append
  );
}

/**
 * Appends one selection command batch into its root-owned overlay product.
 *
 * @param commands - Mutable composite display command list.
 * @param options - Display-list options carrying an optional owner collector.
 * @param paintOrder - Producer-declared order within the overlay lane.
 * @param append - Callback emitting selection range or caret commands.
 * @returns Nothing.
 */
export function appendQuireOwnedSelectionCommands(
  commands: QuireDisplayCommand[],
  options: QuireDisplayListOptions,
  paintOrder: number,
  append: (commands: QuireDisplayCommand[]) => void
): void {
  appendOwnerCommands(
    commands,
    options,
    "selection-overlay",
    "selection-overlay",
    paintOrder,
    append
  );
}

/**
 * Appends annotation commands grouped by exact decoration source.
 *
 * @param commands - Mutable composite display command list.
 * @param visuals - Ordered annotation visuals to compile.
 * @param options - Display-list options carrying an optional owner collector.
 * @param paintOrder - Producer-declared order within the overlay lane.
 * @param append - Callback emitting commands for one visual.
 * @returns Nothing.
 */
export function appendQuireOwnedAnnotationCommands<
  Visual extends QuireAnnotationCommandVisual
>(
  commands: QuireDisplayCommand[],
  visuals: readonly Visual[],
  options: QuireDisplayListOptions,
  paintOrder: number,
  append: (commands: QuireDisplayCommand[], visual: Visual) => void
): void {
  for (const visual of visuals) {
    appendOwnerCommands(
      commands,
      options,
      `annotation:${visual.decorationId}`,
      "annotation-overlay",
      paintOrder,
      (ownerCommands) => append(ownerCommands, visual)
    );
  }
}

/**
 * Appends one directly owned command batch to composite and owner sinks.
 *
 * @param commands - Mutable composite display command list.
 * @param options - Display-list options carrying an optional owner collector.
 * @param productId - Stable retained product identity.
 * @param paintScope - Exact retained paint responsibility.
 * @param paintOrder - Producer-declared order within the target lane.
 * @param append - Callback emitting commands into an owner-local buffer.
 * @returns Nothing.
 */
function appendOwnerCommands(
  commands: QuireDisplayCommand[],
  options: QuireDisplayListOptions,
  productId: string,
  paintScope: "page-chrome" | "selection-overlay" | "annotation-overlay",
  paintOrder: number,
  append: (commands: QuireDisplayCommand[]) => void
): void {
  const ownerCommands: QuireDisplayCommand[] = [];
  append(ownerCommands);
  commands.push(...ownerCommands);
  options.ownerCommandCollector?.append({
    productId,
    paintScope,
    paintOrder,
    commands: ownerCommands
  });
}
