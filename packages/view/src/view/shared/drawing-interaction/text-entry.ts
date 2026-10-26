import type { QuireEditor } from "@quirekit/core";
import type { QuireLayoutRegion } from "@quirekit/layout/identity";
import { Selection } from "@quirekit/pm";
import { NodeSelection } from "@quirekit/pm";
import type { QuireViewEvent } from "@quirekit/renderer";
import {
  resolveQuireDocumentProfile,
  resolveQuireInteractionNearestCaretAtPoint,
  type QuireAuxiliaryStory,
  type QuireDrawingEnterTextEventPayload,
  type QuireInteractionSelectionTarget,
  type QuireRetainedLayerContribution,
  type QuireRetainedLayoutSnapshot
} from "@quirekit/view-engine";
import type { DrawingAnchor } from "@quirekit/drawing-geometry";
import { findMountedDrawingTargetContribution } from "./target-contribution";
import { readMountedDrawingModel } from "./model";
import { readQuireDrawingEnterTextEventPayload } from "./payload";
import type {
  CreateMountedDrawingInteractionRuntimeOptions,
  MountedDrawingCreatedTextBox,
  MountedDrawingTextEditingSession
} from "./types";

/**
 * Enters one independently editable text-box story from selected-object chrome.
 *
 * @param options - Mounted editor, snapshot, and lifecycle callback authority.
 * @param event - Renderer-neutral selected text-entry action.
 * @returns Whether the built-in runtime consumed the action.
 */
export function enterMountedDrawingTextStory(
  options: CreateMountedDrawingInteractionRuntimeOptions,
  event: QuireViewEvent<unknown, QuireDrawingEnterTextEventPayload>
): boolean {
  const payload = readQuireDrawingEnterTextEventPayload(event.payload);
  const snapshot = options.getInteractionSnapshot();
  const target = event.target;
  if (
    options.status !== "primary"
    || payload === undefined
    || snapshot === undefined
    || target === undefined
    || snapshot.state.pm.doc !== options.editor.state.pm.doc
  ) {
    return false;
  }

  const contribution = findMountedDrawingTargetContribution(snapshot.layerContributions, target.id);
  const anchorPosition = contribution?.owner.source.range?.from;
  const attrs = anchorPosition === undefined
    ? undefined
    : readAnchorAttrs(options.editor, anchorPosition);
  if (
    contribution === undefined
    || contribution.activation?.kind !== "selected-owner"
    || anchorPosition === undefined
    || attrs === undefined
    || attrs.objectId !== payload.objectId
    || attrs.drawing.drawingId !== payload.drawingId
    || attrs.storyId !== payload.storyId
  ) {
    return false;
  }

  const entered = enterResolvedMountedDrawingTextStory(
    options,
    contribution,
    payload.objectId,
    payload.drawingId,
    payload.storyId,
    anchorPosition,
    event.point
  );
  if (!entered) {
    return false;
  }
  event.preventDefault();
  event.stopPropagation();
  return true;
}

/**
 * Enters the story referenced by the exact current Word drawing selection.
 *
 * @param options - Mounted editor, snapshot, and lifecycle callback authority.
 * @returns Whether the selected text box transferred input ownership.
 */
export function enterMountedSelectedDrawingTextStory(
  options: CreateMountedDrawingInteractionRuntimeOptions
): boolean {
  const selection = options.editor.state.pm.selection;
  const snapshot = options.getInteractionSnapshot();
  if (
    options.status !== "primary"
    || !(selection instanceof NodeSelection)
    || snapshot === undefined
    || snapshot.state.pm.doc !== options.editor.state.pm.doc
  ) {
    return false;
  }
  const attrs = readAnchorAttrs(options.editor, selection.from);
  const contribution = snapshot.layerContributions?.find((candidate) =>
    candidate.activation?.kind === "selected-owner"
    && candidate.range.from === selection.from
    && candidate.range.to === selection.to
  );
  if (
    attrs === undefined
    || attrs.storyId === null
    || contribution === undefined
  ) {
    return false;
  }
  return enterResolvedMountedDrawingTextStory(
    options,
    contribution,
    attrs.objectId,
    attrs.drawing.drawingId,
    attrs.storyId,
    selection.from
  );
}

/**
 * Transfers PM selection and mounted interaction routing into one text story.
 *
 * @param options - Mounted lifecycle authorities.
 * @param contribution - Exact selected visual occurrence.
 * @param objectId - Stable anchor identity.
 * @param drawingId - Stable drawing payload identity.
 * @param storyId - Stable referenced text-box story identity.
 * @param anchorPosition - Exact position immediately before the anchor.
 * @param point - Optional document-space click point used for first-entry caret placement.
 * @returns Whether selection and input ownership transferred successfully.
 */
function enterResolvedMountedDrawingTextStory(
  options: CreateMountedDrawingInteractionRuntimeOptions,
  contribution: QuireRetainedLayerContribution,
  objectId: string,
  drawingId: string,
  storyId: string,
  anchorPosition: number,
  point?: Readonly<{ x: number; y: number }> | undefined
): boolean {
  const snapshot = options.getInteractionSnapshot();
  if (snapshot === undefined) {
    return false;
  }
  const story = findStory(options.editor, storyId);
  const storyRegion = story === undefined || story.kind !== "textBox"
    ? undefined
    : findDrawingTextRegion(snapshot, objectId, contribution);
  if (
    story === undefined
    || story.kind !== "textBox"
    || storyRegion?.source?.range === undefined
    || storyRegion.rect === undefined
  ) {
    return false;
  }

  const hitPosition = point === undefined
    ? undefined
    : resolveDrawingTextEntryPosition(snapshot, storyRegion, point);
  const selection = Selection.near(
    options.editor.state.pm.doc.resolve(hitPosition ?? story.from),
    1
  );
  if (!options.editor.commands.setTextSelection(selection.from)) {
    return false;
  }

  const interactionTarget: QuireInteractionSelectionTarget = {
    domain: "text",
    commandTarget: "editable-text",
    hitKind: "position",
    region: storyRegion.ref,
    source: storyRegion.source,
    capabilities: storyRegion.capabilities,
    referenceRect: storyRegion.rect
  };
  const session: MountedDrawingTextEditingSession = {
    objectId,
    drawingId,
    storyId,
    anchorPosition,
    interactionTarget
  };
  options.onTextEntry?.(session);
  return true;
}

/**
 * Resolves the first editing caret from retained drawing-story geometry.
 *
 * The selected-object entry surface intentionally masks ordinary pointer hit
 * testing before ownership transfers. Querying retained sub-layout products
 * directly preserves the original click coordinate while still validating the
 * result against the exact independently owned Story range.
 *
 * @param snapshot - Accepted retained snapshot owning drawing-story geometry.
 * @param storyRegion - Exact drawing-text occurrence selected for editing.
 * @param point - Document-space click point inside the text frame.
 * @returns Exact caret position inside the Story, or undefined for stale geometry.
 */
function resolveDrawingTextEntryPosition(
  snapshot: QuireRetainedLayoutSnapshot,
  storyRegion: QuireLayoutRegion,
  point: Readonly<{ x: number; y: number }>
): number | undefined {
  const range = storyRegion.source?.range;
  if (range === undefined) {
    return undefined;
  }
  const hit = resolveQuireInteractionNearestCaretAtPoint({
    snapshot,
    point,
    region: storyRegion.ref
  });
  if (
    hit.kind !== "caret"
    || hit.position.pos < range.from
    || hit.position.pos > range.to
  ) {
    return undefined;
  }
  return hit.position.pos;
}

/**
 * Resolves the first accepted text-editing session for a newly created object.
 *
 * The atomic insertion command already placed the PM selection inside the new
 * story. This resolver waits for the corresponding retained object/story
 * occurrence so input routing can adopt real geometry without a DOM editor.
 *
 * @param options - Mounted editor and current snapshot authority.
 * @param identity - Stable identities emitted by atomic creation.
 * @returns Retained drawing-text session, or undefined before layout catches up.
 */
export function resolveMountedCreatedDrawingTextStory(
  options: CreateMountedDrawingInteractionRuntimeOptions,
  identity: MountedDrawingCreatedTextBox
): MountedDrawingTextEditingSession | undefined {
  const snapshot = options.getInteractionSnapshot();
  if (
    options.status !== "primary"
    || snapshot === undefined
    || snapshot.state.pm.doc !== options.editor.state.pm.doc
  ) {
    return undefined;
  }
  const contribution = snapshot.layerContributions?.find((candidate) => {
    if (candidate.activation?.kind !== "selected-owner") {
      return false;
    }
    const position = candidate.owner.source.range?.from;
    const attrs = position === undefined
      ? undefined
      : readAnchorAttrs(options.editor, position);
    return attrs?.objectId === identity.objectId
      && attrs.drawing.drawingId === identity.drawingId
      && attrs.storyId === identity.storyId;
  });
  const anchorPosition = contribution?.owner.source.range?.from;
  const story = findStory(options.editor, identity.storyId);
  const storyRegion = contribution === undefined
    ? undefined
    : findDrawingTextRegion(snapshot, identity.objectId, contribution);
  if (
    contribution === undefined
    || anchorPosition === undefined
    || story?.kind !== "textBox"
    || storyRegion?.source?.range === undefined
    || storyRegion.rect === undefined
  ) {
    return undefined;
  }
  return {
    objectId: identity.objectId,
    drawingId: identity.drawingId,
    storyId: identity.storyId,
    anchorPosition,
    interactionTarget: {
      domain: "text",
      commandTarget: "editable-text",
      hitKind: "position",
      region: storyRegion.ref,
      source: storyRegion.source,
      capabilities: storyRegion.capabilities,
      referenceRect: storyRegion.rect
    }
  };
}

/**
 * Resolves the editing session of the text box whose story contains a position.
 *
 * @param options - Mounted editor and current snapshot authority.
 * @param position - Document position inside a text-box story.
 * @returns Retained drawing-text session, or undefined when no laid-out text box owns it.
 */
export function resolveMountedDrawingTextStoryAt(
  options: CreateMountedDrawingInteractionRuntimeOptions,
  position: number
): MountedDrawingTextEditingSession | undefined {
  const story = resolveQuireDocumentProfile(options.editor.extensionManager).pageModel
    .listStories(options.editor.state.pm.doc)
    .find((candidate) => candidate.kind === "textBox" && position >= candidate.from && position <= candidate.to);
  const anchor = story === undefined ? undefined : options.getInteractionSnapshot()?.layerContributions
    ?.map((contribution) => contribution.owner.source.range?.from)
    .map((from) => from === undefined ? undefined : readAnchorAttrs(options.editor, from))
    .find((attrs) => attrs?.storyId === story.id);
  return story === undefined || anchor === undefined
    ? undefined
    : resolveMountedCreatedDrawingTextStory(options, {
        objectId: anchor.objectId,
        drawingId: anchor.drawing.drawingId,
        storyId: story.id
      });
}

/**
 * Finds one auxiliary story through the document's page model.
 * @param editor - Mounted editor owning the live document.
 * @param storyId - Persisted story identity.
 * @returns Story facts, or undefined when the document has no such story.
 */
function findStory(editor: QuireEditor, storyId: string): QuireAuxiliaryStory | undefined {
  return resolveQuireDocumentProfile(editor.extensionManager).pageModel.listStories(editor.state.pm.doc).find((story) => story.id === storyId);
}

/**
 * Reads and validates one exact source anchor.
 *
 * @param editor - Mounted editor owning the live document.
 * @param position - Position immediately before the expected anchor.
 * @returns Validated attrs, or undefined when stale.
 */
function readAnchorAttrs(
  editor: QuireEditor,
  position: number
): DrawingAnchor | undefined {
  const node = editor.state.pm.doc.nodeAt(position);
  return node === null ? undefined : readMountedDrawingModel(editor).readAnchor(node.attrs);
}

/**
 * Finds the story region belonging to the selected object occurrence.
 *
 * @param snapshot - Current retained interaction snapshot.
 * @param objectId - Stable anchor object identity.
 * @param contribution - Selected object occurrence contribution.
 * @returns Exact drawing-text region, or undefined when not laid out.
 */
function findDrawingTextRegion(
  snapshot: QuireRetainedLayoutSnapshot,
  objectId: string,
  contribution: QuireRetainedLayerContribution
): QuireLayoutRegion | undefined {
  const expectedRegionId = `region:word-drawing-text:${objectId}`;
  const selectedPage = readPageIndex(contribution.owner.region.visualInstanceId);

  return snapshot.viewGraph?.regions.find((region) => {
    if (region.ref.regionId.value !== expectedRegionId) {
      return false;
    }
    const storyPage = readPageIndex(region.ref.visualInstanceId);
    return selectedPage === null ? storyPage === null : storyPage === selectedPage;
  });
}

/**
 * Reads a page index from retained visual-instance identity.
 *
 * @param visualInstanceId - Candidate page-projected occurrence id.
 * @returns Page index, or null for a single/continuous occurrence.
 */
function readPageIndex(visualInstanceId: string | undefined): number | null {
  const value = visualInstanceId?.match(/^page:(\d+):/u)?.[1];
  return value === undefined ? null : Number.parseInt(value, 10);
}
