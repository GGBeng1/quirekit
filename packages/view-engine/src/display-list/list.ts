import { doesQuireRectIntersectClip } from "../layout/geometry/clip";
import { observeNewDisplayCommands, traceQuireDisplayListPhase } from "./instrumentation";
import { appendInvisibleCharacterCommands } from "./commands/invisible-characters";
import type {
  QuireClipCommand,
  QuireDisplayCommand,
  QuireDisplayList,
  QuireRect
} from "@quirekit/renderer";
import {
  normalizeQuirePositiveAreaRects
} from "@quirekit/renderer";
import type { QuireLayoutNode } from "../layout";
import type { QuireLayoutSnapshot } from "../editor-layout";
import { buildQuireTablePaintModel } from "@quirekit/layout/table";
import {
  appendDecorationBackgroundCommands,
  appendDecorationNodeCommands
} from "./commands/decorations";
import { appendDecorationPointMarkerCommands } from "./commands/point-marker";
import { appendDecorationGutterMarkerCommands } from "./commands/gutter-marker";
import { appendPageChromeCommands, appendPageRuleCommands } from "./commands/pages";
import {
  appendQuireLayerContributionCommands,
  appendQuireRuntimeActivatedLayerContributionCommands
} from "./commands/layer-contributions";
import { appendDocumentBackgroundCommand } from "./commands/primitives";
import {
  appendCaretCommands,
  appendSelectionRangeCommands
} from "./commands/selection";
import { resolveDisplayListStyles } from "./styles";
import {
  appendQuireOwnedAnnotationCommands,
  appendQuireOwnedContentCommands,
  appendQuireOwnedPageChromeCommands,
  appendQuireOwnedSelectionCommands
} from "./ownership";
import { appendQuireSubLayoutContentCommands } from "./sub-layout";
import {
  appendTextNodeCommands,
  createQuireTextCommandTraceStats,
  emitQuireTextCommandTraceStats
} from "./commands/text";
import type { QuireTextCommandTraceStats } from "./text/types";
import {
  appendParagraphBorderCommands,
  appendParagraphShadingCommand
} from "./commands/paragraph-decoration/index";
import { compileQuireTablePaintCommands } from "./table";
import { doesQuireContentNodeIntersectClip } from "./table/visibility";
import type {
  QuireDisplayListOptions,
  QuireDisplayListStyles
} from "./types";
import { resolveQuireViewLayerPlaneDescriptor } from "../view-graph";
import { createQuireDrawingTextContentRootResolver } from "./composition/drawing-text";
import { quireNeutralDocumentProfile } from "../document-profile/defaults";
import { appendContentCommandBatch, createDrawingTextContentClip } from "./composition/content-clip";
import type { QuireContentClip } from "./composition/types";

const emptyLayoutNodes: readonly QuireLayoutNode[] = [];

/**
 * Builds a renderer-agnostic display list from a layout snapshot.
 *
 * @param options - Layout snapshot, optional selection geometry, and style overrides.
 * @returns Display list containing ordered paint commands.
 */
export function buildQuireDisplayList(
  options: QuireDisplayListOptions
): QuireDisplayList {
  if (
    options.retainCompositeCommands === false &&
    options.commandObserver === undefined &&
    options.ownerCommandCollector === undefined
  ) {
    throw new RangeError(
      "Non-composite display-list builds require an explicit command owner."
    );
  }

  const trace = options.trace;
  const clipRects = normalizeQuirePositiveAreaRects(options.clipRects);
  const styles = traceQuireDisplayListPhase(
    trace,
    "display-list:styles",
    () => resolveDisplayListStyles(options.styles, options.surfaceConfig)
  );
  const commands: QuireDisplayCommand[] = [];
  const resolveDrawingTextRoot = createQuireDrawingTextContentRootResolver(
    readQuireDrawingTextContentRoots(options.snapshot.root.children)
  );
  let observedCommandCount = 0;

  /**
   * Runs an append phase and mirrors newly appended commands to observers.
   *
   * @param name - Stable phase name shown in diagnostics.
   * @param callback - Phase work that may append display commands.
   */
  function runObservedDisplayListPhase(name: string, callback: () => void): void {
    traceQuireDisplayListPhase(trace, name, callback);
    observedCommandCount = observeNewDisplayCommands(
      commands,
      options.commandObserver,
      observedCommandCount
    );
    if (options.retainCompositeCommands === false) {
      commands.length = 0;
      observedCommandCount = 0;
    }
  }

  runObservedDisplayListPhase(
    "display-list:document-background",
    () => appendQuireOwnedPageChromeCommands(
      commands,
      options,
      0,
      (ownerCommands) => appendDocumentBackgroundCommand(
        ownerCommands,
        options.snapshot.documentRect,
        styles
      )
    )
  );
  runObservedDisplayListPhase(
    "display-list:page-chrome",
    () => appendQuireOwnedPageChromeCommands(
      commands,
      options,
      10,
      (ownerCommands) => appendPageChromeCommands(
        ownerCommands,
        filterDisplayListItemsByRect(
          options.snapshot.pages ?? [],
          clipRects,
          (page) => page.pageRect
        ),
        styles
      )
    )
  );
  runObservedDisplayListPhase(
    "display-list:layer-contribution-behind-content",
    () => {
      const textTraceStats = createQuireTextCommandTraceStats(trace);
      appendQuireLayerContributionCommands(
        commands,
        options.snapshot,
        "content",
        clipRects,
        options.ownerCommandCollector,
        options.surfaceConfig,
        (contribution) => resolveQuireAuxiliaryStoryOpacity(
          contribution.interactionScope ?? contribution.owner,
          options,
          styles
        ),
        isQuireContributionAtOrBelowContent,
        (contribution, paintOrder) => {
          const storyRoot = resolveDrawingTextRoot(contribution);
          if (storyRoot === undefined) {
            return;
          }
          appendContentCommands(
            commands,
            [storyRoot],
            options,
            styles,
            textTraceStats,
            clipRects,
            paintOrder,
            createDrawingTextContentClip(storyRoot)
          );
        }
      );
      emitQuireTextCommandTraceStats(textTraceStats);
    }
  );
  // Page rules sit between behind-text drawings (retained order 50-52) and body content (100).
  runObservedDisplayListPhase(
    "display-list:page-rules",
    () => appendQuireOwnedPageChromeCommands(
      commands,
      options,
      60,
      (ownerCommands) => appendPageRuleCommands(
        ownerCommands,
        filterDisplayListItemsByRect(
          options.snapshot.pages ?? [],
          clipRects,
          (page) => page.pageRect
        )
      )
    )
  );
  runObservedDisplayListPhase(
    "display-list:decoration-backgrounds",
    () => appendQuireOwnedAnnotationCommands(
      commands,
      filterDisplayListItemsByRect(
        options.decorationLane?.backgrounds ?? [],
        clipRects,
        (visual) => visual.rect
      ),
      options,
      100_000,
      (ownerCommands, visual) => appendDecorationBackgroundCommands(
        ownerCommands,
        [visual],
        styles
      )
    )
  );
  runObservedDisplayListPhase(
    "display-list:selection-ranges",
    () => appendQuireOwnedSelectionCommands(
      commands,
      options,
      200_000,
      (ownerCommands) => appendSelectionRangeCommands(
        ownerCommands,
        filterDisplayListItemsByRect(
          options.selectionGeometry?.ranges ?? [],
          clipRects,
          (range) => range.rect
        ),
        styles
      )
    )
  );
  runObservedDisplayListPhase(
    "display-list:content",
    () => {
      const textTraceStats = createQuireTextCommandTraceStats(trace);
      appendContentCommands(
        commands,
        readQuireBodyContentRoots(options.snapshot.root.children),
        options,
        styles,
        textTraceStats,
        clipRects
      );
      emitQuireTextCommandTraceStats(textTraceStats);
    }
  );
  runObservedDisplayListPhase(
    "display-list:layer-contribution-above-content",
    () => {
      const textTraceStats = createQuireTextCommandTraceStats(trace);
      appendQuireLayerContributionCommands(
        commands,
        options.snapshot,
        "content",
        clipRects,
        options.ownerCommandCollector,
        options.surfaceConfig,
        (contribution) => resolveQuireAuxiliaryStoryOpacity(
          contribution.interactionScope ?? contribution.owner,
          options,
          styles
        ),
        isQuireContributionAboveContent,
        (contribution, paintOrder) => {
          const storyRoot = resolveDrawingTextRoot(contribution);
          if (storyRoot === undefined) {
            return;
          }
          appendContentCommands(
            commands,
            [storyRoot],
            options,
            styles,
            textTraceStats,
            clipRects,
            paintOrder,
            createDrawingTextContentClip(storyRoot)
          );
        }
      );
      emitQuireTextCommandTraceStats(textTraceStats);
    }
  );
  runObservedDisplayListPhase(
    "display-list:layer-contribution-overlay",
    () => appendQuireLayerContributionCommands(
      commands,
      options.snapshot,
      "overlay",
      clipRects,
      options.ownerCommandCollector,
      options.surfaceConfig,
      (contribution) => resolveQuireAuxiliaryStoryOpacity(
        contribution.interactionScope ?? contribution.owner,
        options,
        styles
      )
    )
  );
  runObservedDisplayListPhase(
    "display-list:decoration-nodes",
    () => appendQuireOwnedAnnotationCommands(
      commands,
      filterDisplayListItemsByRect(
        options.decorationLane?.nodes ?? [],
        clipRects,
        (visual) => visual.rect
      ),
      options,
      400_000,
      (ownerCommands, visual) => appendDecorationNodeCommands(
        ownerCommands,
        [visual],
        styles
      )
    )
  );
  runObservedDisplayListPhase(
    "display-list:decoration-gutter-markers",
    () => appendQuireOwnedAnnotationCommands(
      commands,
      filterDisplayListItemsByRect(
        options.decorationLane?.gutterMarkers ?? [],
        clipRects,
        (visual) => visual.rect
      ),
      options,
      425_000,
      (ownerCommands, visual) => appendDecorationGutterMarkerCommands(
        ownerCommands,
        [visual]
      )
    )
  );
  runObservedDisplayListPhase(
    "display-list:decoration-point-markers",
    () => appendQuireOwnedAnnotationCommands(
      commands,
      filterDisplayListItemsByRect(
        options.decorationLane?.pointMarkers ?? [],
        clipRects,
        (visual) => visual.rect
      ),
      options,
      450_000,
      (ownerCommands, visual) => appendDecorationPointMarkerCommands(
        ownerCommands,
        [visual]
      )
    )
  );
  runObservedDisplayListPhase("display-list:invisible-characters", () =>
    appendQuireOwnedAnnotationCommands(commands,
      options.decorationLane?.invisibleCharacters ?? [], options, 460_000,
      appendInvisibleCharacterCommands));
  if (!options.omitCaretCommands) {
    runObservedDisplayListPhase(
      "display-list:carets",
      () => appendQuireOwnedSelectionCommands(
        commands,
        options,
        500_000,
        (ownerCommands) => appendCaretCommands(
          ownerCommands,
          filterDisplayListItemsByRect(
            options.selectionGeometry?.carets ?? [],
            clipRects,
            (caret) => caret.rect
          ),
          styles
        )
      )
    );
  }

  return {
    bounds: options.snapshot.documentRect,
    commands
  };
}

/**
 * Appends persistent document content commands, routing tables through table paint.
 *
 * @param commands - Mutable display command list being built.
 * @param nodes - Layout nodes to convert into display commands.
 * @param options - Display-list build options containing the source snapshot.
 * @param styles - Resolved display-list styles.
 * @param textTraceStats - Optional aggregate diagnostics for text command work.
 * @param clipRects - Optional viewport realization clips.
 * @param paintOrder - Retained lane order for this content family.
 * @param contentClip - Optional persistent paint boundary for an owned story.
 * @param compileSourceGeometry - Whether explicitly selected source roots may paint.
 * @returns Nothing.
 */
function appendContentCommands(
  commands: QuireDisplayCommand[],
  nodes: readonly QuireLayoutNode[],
  options: QuireDisplayListOptions,
  styles: QuireDisplayListStyles,
  textTraceStats?: QuireTextCommandTraceStats | undefined,
  clipRects?: readonly QuireRect[] | undefined,
  paintOrder = 100,
  contentClip?: QuireContentClip | undefined,
  compileSourceGeometry = false
): void {
  if (contentClip !== undefined) {
    if (!doesQuireRectIntersectClip(contentClip.pageRect ?? contentClip.visualBounds ?? contentClip.rect, clipRects)) return;
    // Children are in pre-transform coordinates; retain their complete paint
    // tree and let the transformed inner clip plus physical page clip decide.
    if (contentClip.transform !== undefined) {
      clipRects = undefined;
      options = { ...options, clipRects: undefined };
    }
  }
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!;
    if (
      node.interactionRole === "source-geometry" &&
      !compileSourceGeometry
    ) {
      continue;
    }
    if (!doesQuireContentNodeIntersectClip(node, clipRects)) {
      continue;
    }

    if (node.table) {
      appendQuireOwnedContentCommands(
        commands,
        node,
        options,
        (ownerCommands) => appendContentCommandBatch(
          ownerCommands,
          node,
          contentClip,
          (clippedCommands) => appendTableNodeCommands(
            clippedCommands,
            node,
            options,
            styles,
            textTraceStats,
            clipRects
          )
        ),
        paintOrder,
        resolveQuireContentNodeOpacity(node, options, styles)
      );
      continue;
    }

    const children = node.children;
    if (children !== undefined && children.length > 0) {
      const ordinaryChildren = node.subLayoutDisplayChunks === undefined
        ? children
        : children.filter(
            (child) => child.interactionRole !== "source-geometry"
          );
      appendContentCommands(
        commands,
        ordinaryChildren,
        options,
        styles,
        textTraceStats,
        clipRects,
        paintOrder,
        contentClip,
        compileSourceGeometry
      );
      appendQuireSubLayoutContentCommands(
        commands,
        node,
        options,
        paintOrder,
        (sourceCommands, sourceRoots) => appendContentCommands(
          sourceCommands,
          sourceRoots,
          { ...options, ownerCommandCollector: undefined },
          styles,
          textTraceStats,
          clipRects,
          paintOrder,
          contentClip,
          true
        )
      );
      continue;
    }

    appendQuireOwnedContentCommands(
      commands,
      node,
      options,
      (ownerCommands) => appendContentCommandBatch(
        ownerCommands,
        node,
        contentClip,
        (clippedCommands) => {
          appendParagraphShadingCommand(clippedCommands, node);
          appendTextNodeCommands(
            clippedCommands,
            node,
            options,
            styles,
            textTraceStats
          );
          appendParagraphBorderCommands(clippedCommands, node, styles);
        }
      ),
      paintOrder,
      resolveQuireContentNodeOpacity(node, options, styles)
    );
  }
}

/**
 * Resolves transient story and checked-task opacity without modifying content styles.
 *
 * Mounted editing state explicitly identifies the active story source. PM
 * selection alone is insufficient because retained selection-only renders may
 * reuse content and because editing ownership is intentionally view-local.
 *
 * @param node - Layout node whose directly owned commands are being emitted.
 * @param options - Display-list options carrying the current editor state.
 * @param styles - Resolved presentation tokens.
 * @returns Combined presentation opacity, or undefined for full opacity.
 */
function resolveQuireContentNodeOpacity(
  node: QuireLayoutNode,
  options: QuireDisplayListOptions,
  styles: QuireDisplayListStyles
): number | undefined {
  return resolveQuireOwnerContentOpacity(
    node.layoutOwner,
    node.range,
    options,
    styles
  );
}

/**
 * Resolves transient presentation shared by ordinary and retained owner content.
 *
 * @param owner - Story or exact region owner represented by the content.
 * @param range - Document range used to resolve paragraph-owned presentation.
 * @param options - Display-list options carrying the current editor state.
 * @param styles - Resolved presentation tokens.
 * @returns Combined presentation opacity, or undefined for full opacity.
 */
function resolveQuireOwnerContentOpacity(
  owner: QuireLayoutNode["layoutOwner"],
  range: QuireLayoutNode["range"],
  options: QuireDisplayListOptions,
  styles: QuireDisplayListStyles
): number | undefined {
  let opacity = resolveQuireAuxiliaryStoryOpacity(owner, options, styles) ?? 1;
  if (isQuireCheckedTaskRange(range, options.snapshot)) {
    opacity *= styles.checkedTaskContentOpacity;
  }
  return opacity === 1 ? undefined : opacity;
}

/**
 * Resolves header/footer editing-state opacity for any story-owned paint product.
 *
 * @param owner - Story or exact region owner represented by the content.
 * @param options - Display-list options carrying active auxiliary-story state.
 * @param styles - Resolved presentation tokens.
 * @returns Inactive-story opacity, or undefined outside an inactive story.
 */
function resolveQuireAuxiliaryStoryOpacity(
  owner: QuireLayoutNode["layoutOwner"],
  options: QuireDisplayListOptions,
  styles: QuireDisplayListStyles
): number | undefined {
  if (
    (owner?.region.kind === "header" || owner?.region.kind === "footer")
    && options.activeAuxiliaryStorySourceId !== owner.source.sourceId
  ) {
    return styles.inactiveAuxiliaryStoryOpacity;
  }
  return undefined;
}

/**
 * Reports whether a layout content range belongs to a checked task paragraph.
 *
 * @param range - Document range whose ancestry may identify a paragraph.
 * @param snapshot - Snapshot carrying the canonical editor state and document semantics.
 * @returns Whether the owning textblock is a checked task.
 */
function isQuireCheckedTaskRange(
  range: QuireLayoutNode["range"],
  snapshot: QuireLayoutSnapshot
): boolean {
  const document = (snapshot.state as Partial<QuireLayoutSnapshot["state"]>).doc;
  if (document === undefined) return false;
  const model = snapshot.documentProfile?.paragraphModel ?? quireNeutralDocumentProfile.paragraphModel;
  const direct = document.nodeAt(range.from);
  if (direct?.isTextblock) return model.isCheckedTask(direct);
  const resolved = document.resolve(Math.max(0, Math.min(document.content.size, range.from)));
  for (let depth = resolved.depth; depth >= 0; depth -= 1) {
    const candidate = resolved.node(depth);
    if (candidate.isTextblock) return model.isCheckedTask(candidate);
  }
  return false;
}

/**
 * Reads normal body and auxiliary-story roots excluding drawing-owned text.
 *
 * @param nodes - Top-level snapshot children.
 * @returns Roots painted in the normal content phase.
 */
function readQuireBodyContentRoots(
  nodes: readonly QuireLayoutNode[] | undefined
): readonly QuireLayoutNode[] {
  return (nodes ?? emptyLayoutNodes).filter((node) =>
    node.layoutOwner?.region.kind !== "drawing-text"
  );
}

/**
 * Reads drawing-owned story roots painted above their accepted object surfaces.
 *
 * @param nodes - Top-level snapshot children.
 * @returns Drawing-text roots in stable occurrence order.
 */
function readQuireDrawingTextContentRoots(
  nodes: readonly QuireLayoutNode[] | undefined
): readonly QuireLayoutNode[] {
  return (nodes ?? emptyLayoutNodes).filter((node) =>
    node.layoutOwner?.region.kind === "drawing-text"
  );
}

/**
 * Reports whether one contribution belongs at or behind normal text content.
 *
 * @param contribution - Retained layer contribution.
 * @returns Whether its canonical plane is no higher than content.
 */
function isQuireContributionAtOrBelowContent(
  contribution: NonNullable<QuireLayoutSnapshot["layerContributions"]>[number]
): boolean {
  return resolveQuireViewLayerPlaneDescriptor(contribution.layer.plane).displayOrder
    <= resolveQuireViewLayerPlaneDescriptor("content").displayOrder;
}

/**
 * Reports whether one contribution belongs above normal text content.
 *
 * @param contribution - Retained layer contribution.
 * @returns Whether its canonical plane is higher than content.
 */
function isQuireContributionAboveContent(
  contribution: NonNullable<QuireLayoutSnapshot["layerContributions"]>[number]
): boolean {
  return !isQuireContributionAtOrBelowContent(contribution);
}

/**
 * Appends table background, clipped cell content, and border commands.
 *
 * @param commands - Mutable display command list being built.
 * @param node - Table layout node to convert.
 * @param options - Display-list build options containing the source snapshot.
 * @param styles - Resolved display-list styles.
 * @param textTraceStats - Optional aggregate diagnostics for text command work.
 */
function appendTableNodeCommands(
  commands: QuireDisplayCommand[],
  node: QuireLayoutNode,
  options: QuireDisplayListOptions,
  styles: QuireDisplayListStyles,
  textTraceStats?: QuireTextCommandTraceStats | undefined,
  clipRects?: readonly QuireRect[] | undefined
): void {
  if (!node.table) {
    return;
  }

  const table = node.table;
  const cachedPaintModel = options.commandCache?.getTablePaintModel(table);
  const paintModel = cachedPaintModel ?? traceQuireDisplayListPhase(
    options.trace,
    "display-list:table-paint-model",
    () => buildQuireTablePaintModel(table)
  );
  if (cachedPaintModel === undefined) {
    options.commandCache?.setTablePaintModel(table, paintModel);
  }
  const cachedTableCommands = options.commandCache?.getTablePaintCommands(paintModel);
  const tableCommands = cachedTableCommands ?? traceQuireDisplayListPhase(
    options.trace,
    "display-list:table-command-compile",
    () => compileQuireTablePaintCommands(paintModel)
  );
  if (cachedTableCommands === undefined) {
    options.commandCache?.setTablePaintCommands(paintModel, tableCommands);
  }
  const cellNodesById = createTableCellLayoutNodeLookup(node);

  for (const command of tableCommands) {
    if (command.kind === "clip") {
      if (!doesQuireRectIntersectClip(command.rect, clipRects)) {
        commands.push(command);
        continue;
      }

      commands.push({
        ...command,
        commands: traceQuireDisplayListPhase(
          options.trace,
          "display-list:table-cell-content",
          () => buildTableCellClipCommands(
            command,
            node,
            options,
            styles,
            textTraceStats,
            clipRects,
            cellNodesById
          )
        )
      });
      continue;
    }

    commands.push(command);
  }
}

/**
 * Builds nested content commands for one table cell clip.
 *
 * @param clip - Clip command emitted for a table cell content rectangle.
 * @param tableNode - Table layout node that owns cell children.
 * @param options - Display-list build options containing the source snapshot.
 * @param styles - Resolved display-list styles.
 * @param textTraceStats - Optional aggregate diagnostics for text command work.
 * @param cellNodesById - Per-table lookup from cell layout ids to layout nodes.
 * @returns Nested display commands for the clipped table cell content.
 */
function buildTableCellClipCommands(
  clip: QuireClipCommand,
  tableNode: QuireLayoutNode,
  options: QuireDisplayListOptions,
  styles: QuireDisplayListStyles,
  textTraceStats?: QuireTextCommandTraceStats | undefined,
  clipRects?: readonly QuireRect[] | undefined,
  cellNodesById?: ReadonlyMap<string, QuireLayoutNode> | undefined
): readonly QuireDisplayCommand[] {
  const cellNode = findTableCellLayoutNodeForClip(tableNode, clip, cellNodesById);
  const commands: QuireDisplayCommand[] = [];

  const children = cellNode?.children ?? emptyLayoutNodes;
  appendContentCommands(
    commands,
    children,
    options,
    styles,
    textTraceStats,
    clipRects,
    100,
    undefined,
    true
  );

  return commands;
}

/**
 * Filters items by a document-space rectangle when display-list clipping is active.
 *
 * @param items - Items to filter.
 * @param clipRects - Active clip rectangles, or undefined when clipping is disabled.
 * @param readRect - Reads the document-space rectangle from one item.
 * @returns Original items when unclipped, otherwise the intersecting subset.
 */
function filterDisplayListItemsByRect<Item>(
  items: readonly Item[],
  clipRects: readonly QuireRect[] | undefined,
  readRect: (item: Item) => QuireRect
): readonly Item[] {
  if (clipRects === undefined) {
    return items;
  }

  const filtered: Item[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]!;

    if (doesQuireRectIntersectClip(readRect(item), clipRects)) {
      filtered.push(item);
    }
  }

  return filtered;
}



/**
 * Creates a per-table lookup for table cell layout nodes.
 *
 * @param tableNode - Table layout node whose children represent cell content roots.
 * @returns Cell layout nodes keyed by their stable layout node ids.
 */
function createTableCellLayoutNodeLookup(
  tableNode: QuireLayoutNode
): ReadonlyMap<string, QuireLayoutNode> | undefined {
  const children = tableNode.children;

  if (children === undefined || children.length === 0) {
    return undefined;
  }

  const lookup = new Map<string, QuireLayoutNode>();

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]!;
    lookup.set(child.id, child);
  }

  return lookup;
}

/**
 * Finds the layout node whose content belongs inside a table cell clip.
 *
 * @param tableNode - Table layout node whose children are cell boxes.
 * @param clip - Clip command to match by stable id.
 * @param cellNodesById - Optional per-table lookup built once for all clips.
 * @returns Matching cell layout node, or null when none exists.
 */
function findTableCellLayoutNodeForClip(
  tableNode: QuireLayoutNode,
  clip: QuireClipCommand,
  cellNodesById?: ReadonlyMap<string, QuireLayoutNode> | undefined
): QuireLayoutNode | null {
  const cellId = clip.id.endsWith(":clip") ? clip.id.slice(0, -":clip".length) : clip.id;
  const lookupResult = cellNodesById?.get(cellId);

  if (lookupResult !== undefined) {
    return lookupResult;
  }

  const children = tableNode.children;
  if (children === undefined) {
    return null;
  }

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]!;
    if (child.id === cellId) {
      return child;
    }
  }

  return null;
}

/**
 * Builds transient overlay commands for a retained layout snapshot.
 *
 * Selection highlights, runtime-activated region contributions, and carets are
 * rebuilt together. Persistent contribution and decoration commands remain in
 * their retained owner chunks and are deliberately not emitted here.
 *
 * @param options - Layout snapshot, selection geometry, and style overrides.
 * @returns Overlay-only display list.
 */
export function buildQuireOverlayDisplayList(
  options: QuireDisplayListOptions
): QuireDisplayList {
  const styles = resolveDisplayListStyles(options.styles, options.surfaceConfig);
  const commands: QuireDisplayCommand[] = [];
  let observedCommandCount = 0;

  appendQuireOwnedSelectionCommands(
    commands,
    options,
    200,
    (ownerCommands) => appendSelectionRangeCommands(
      ownerCommands,
      options.selectionGeometry?.ranges ?? [],
      styles
    )
  );
  observedCommandCount = observeNewDisplayCommands(
    commands,
    options.commandObserver,
    observedCommandCount
  );

  appendQuireRuntimeActivatedLayerContributionCommands(
    commands,
    options.snapshot,
    "overlay",
    options.clipRects,
    options.ownerCommandCollector,
    options.surfaceConfig,
    (contribution) => resolveQuireAuxiliaryStoryOpacity(
      contribution.interactionScope ?? contribution.owner,
      options,
      styles
    )
  );
  observedCommandCount = observeNewDisplayCommands(
    commands,
    options.commandObserver,
    observedCommandCount
  );

  appendQuireOwnedAnnotationCommands(commands,
    options.decorationLane?.invisibleCharacters ?? [], options, 460_000,
    appendInvisibleCharacterCommands);
  observedCommandCount = observeNewDisplayCommands(
    commands, options.commandObserver, observedCommandCount
  );
  if (!options.omitCaretCommands) {
    appendQuireOwnedSelectionCommands(
      commands,
      options,
      500,
      (ownerCommands) => appendCaretCommands(
        ownerCommands,
        options.selectionGeometry?.carets ?? [],
        styles
      )
    );
    observeNewDisplayCommands(
      commands,
      options.commandObserver,
      observedCommandCount
    );
  }

  return {
    bounds: options.snapshot.documentRect,
    commands
  };
}
