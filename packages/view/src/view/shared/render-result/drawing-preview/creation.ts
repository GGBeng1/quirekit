import {
  type QuireDisplayCommand,
  type QuireDisplayList
} from "@quirekit/renderer";
import {
  applyQuireObjectSelectionSurfaceConfig,
  createQuireWordShapePaintCommands,
  isQuireRetainedLayerContributionActive,
  quireNeutralDocumentProfile
} from "@quirekit/view-engine";
import {
  refreshQuirePageStackExactContentCommands,
  refreshQuirePageStackExactOverlayCommands
} from "../../page-stack";
import type { QuireViewRenderResult } from "../../../types";
import { replaceMountedDrawingPreviewCommands } from "./replace";
import type { CreateMountedDrawingPreviewRenderResultOptions } from "./types";

const creationContentPrefix = "mounted-drawing-create-content:";
const creationOverlayPrefix = "mounted-drawing-create-overlay:";

/**
 * Projects one source-free creation frame into retained Canvas/SVG paint.
 *
 * @param options - Previous result, creation state, and active/restore mode.
 * @returns Transient result that preserves accepted layout and targets.
 */
export function createMountedDrawingCreationPreviewRenderResult(
  options: CreateMountedDrawingPreviewRenderResultOptions
): QuireViewRenderResult {
  if (options.state.kind !== "creating") {
    return options.previousRenderResult;
  }
  const previous = options.previousRenderResult;
  const commands = compileCreationCommands(options);
  // Suppress only the active selected-owner chrome; review/collaboration paint stays intact.
  const selectedCommands = previous.layoutSnapshot.layerContributions
    ?.filter((contribution) => contribution.activation?.kind === "selected-owner"
      && isQuireRetainedLayerContributionActive(contribution, previous.layoutSnapshot.state))
    .flatMap((contribution) => contribution.commands) ?? [];
  const replacedIds = collectCreationCommandIds(previous, [...commands, ...selectedCommands]);
  const contentList: QuireDisplayList = {
    bounds: previous.layoutSnapshot.documentRect,
    commands: options.active ? commands : []
  };
  const overlayList: QuireDisplayList = {
    bounds: previous.layoutSnapshot.documentRect,
    commands: options.active ? [] : applyQuireObjectSelectionSurfaceConfig(
      selectedCommands, options.surfaceConfig?.objectSelection
    )
  };
  const pageChunksOwnCommands = previous.pageDisplayListChunks !== undefined
    && previous.displayList.commands.length === 0;
  if (pageChunksOwnCommands) {
    const contentChunks = refreshQuirePageStackExactContentCommands(
      previous.pageDisplayListChunks,
      contentList,
      replacedIds
    );
    return {
      ...previous,
      pageDisplayListChunks: refreshQuirePageStackExactOverlayCommands(
        contentChunks,
        overlayList,
        replacedIds
      )
    };
  }
  const contentDisplayList = {
    ...previous.contentDisplayList,
    commands: replaceMountedDrawingPreviewCommands(
      previous.contentDisplayList.commands,
      contentList.commands,
      replacedIds
    )
  };
  const overlayDisplayList = {
    ...previous.overlayDisplayList,
    commands: replaceMountedDrawingPreviewCommands(
      previous.overlayDisplayList.commands,
      overlayList.commands,
      replacedIds
    )
  };
  return {
    ...previous,
    contentDisplayList,
    overlayDisplayList,
    displayList: {
      ...previous.displayList,
      commands: [
        ...contentDisplayList.commands,
        ...overlayDisplayList.commands
      ]
    }
  };
}

/**
 * Compiles provisional geometry without committed-object selection handles.
 *
 * @param options - Creation state carrying the latest normalized frame.
 * @returns Source-free shape paint commands.
 */
function compileCreationCommands(
  options: CreateMountedDrawingPreviewRenderResultOptions
): readonly QuireDisplayCommand[] {
  const state = options.state;
  // A click-default frame is only a release candidate; pointer-down and jitter
  // must not paint it before the shared controller recognizes a drag.
  if (state.kind !== "creating" || !state.dragged) return [];
  const frame = state.track.previewFrame;
  const model = options.previousRenderResult.layoutSnapshot.documentProfile?.drawingModel
    ?? quireNeutralDocumentProfile.drawingModel;
  const source = state.drawingKind === "shape" && state.geometry
    ? { ...model.createDrawing(state.identity.drawingId, state.geometry.kind === "preset" ? state.geometry.preset : "rect"), geometry: state.geometry }
    : model.createDrawing(state.identity.drawingId);
  const drawing = { ...source, transform: { ...source.transform, flipVertical: state.track.flipVertical ?? false } };
  return createQuireWordShapePaintCommands(drawing, frame.rect,
    `${creationContentPrefix}${state.identity.objectId}`);
}

/**
 * Collects every current or prior creation-preview command id.
 *
 * @param previous - Current transient or accepted render result.
 * @param commands - Newly compiled preview commands.
 * @returns Exact ids safe to replace across content and overlay planes.
 */
function collectCreationCommandIds(
  previous: QuireViewRenderResult,
  commands: readonly QuireDisplayCommand[]
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const command of commands) {
    collectOwnedCommandIds(command, ids, true);
  }
  for (const command of [
    ...previous.contentDisplayList.commands,
    ...previous.overlayDisplayList.commands,
    ...previous.displayList.commands,
    ...(previous.pageDisplayListChunks?.chunks.flatMap((chunk) => [
      ...chunk.contentDisplayList.commands,
      ...chunk.overlayDisplayList.commands
    ]) ?? [])
  ]) {
    collectOwnedCommandIds(command, ids, false);
  }
  return ids;
}

/**
 * Collects one command tree when it belongs to the creation-preview family.
 *
 * @param command - Display command to inspect.
 * @param ids - Mutable exact-id set.
 * @param includeAll - Whether every command is newly compiled and therefore owned.
 */
function collectOwnedCommandIds(
  command: QuireDisplayCommand,
  ids: Set<string>,
  includeAll: boolean
): void {
  if (
    includeAll
    || command.id.startsWith(creationContentPrefix)
    || command.id.startsWith(creationOverlayPrefix)
  ) {
    ids.add(command.id);
  }
  if (command.kind === "clip") {
    for (const nested of command.commands) {
      collectOwnedCommandIds(nested, ids, includeAll);
    }
  }
}
