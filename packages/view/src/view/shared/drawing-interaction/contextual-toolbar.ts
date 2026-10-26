import { NodeSelection } from "@quirekit/pm";
import type { QuireRect } from "@quirekit/renderer";
import type { QuireRetainedLayerContribution } from "@quirekit/view-engine";
import type { DrawingAnchor } from "@quirekit/drawing-geometry";
import { readMountedDrawingModel } from "./model";
import { createDrawingCommandCard } from "./command";
import { readDrawingToolbarRenderer, observeDrawingToolbarRenderer } from "./command/renderer";
import type { CreateDrawingCommandCardOptions } from "./command/types";
import { resolveDrawingContextualCommandLocale } from "./command/copy";
import type { DrawingContextualMenuCommandId } from "./command/types";
import type { DrawingCustomColorCommandId } from "./command/types";
import type {
  CreateMountedDrawingContextualCommandsControllerOptions,
  MountedDrawingContextualCommandsController
} from "./types";

/**
 * Creates shared Canvas/SVG contextual command chrome for selected drawings.
 *
 * @param options - Exact selection, retained geometry, and command callbacks.
 * @returns Controller that mounts and reprojects one transient command card.
 */
export function createMountedDrawingContextualCommandsController(
  options: CreateMountedDrawingContextualCommandsControllerOptions
): MountedDrawingContextualCommandsController {
  let card: ReturnType<typeof createDrawingCommandCard> | null = null;
  let openMenuCommand: DrawingContextualMenuCommandId | null = null;
  let openCustomColorCommand: DrawingCustomColorCommandId | null = null;
  let destroyed = false;
  let identity: string | null = null;
  let renderer = readDrawingToolbarRenderer(options.editor);

  /**
   * Removes the current transient command surface.
   *
   * @param preserveOpenMenu - Whether a canonical refresh will restore its menu.
   */
  const remove = (preserveOpenMenu = false): void => {
    card?.destroy();
    card = null;
    identity = null;
    if (!preserveOpenMenu) {
      openMenuCommand = null;
      openCustomColorCommand = null;
    }
  };

  /** Mounts one command card above an accepted drawing occurrence. */
  const mount = (
    rect: QuireRect,
    selected: SelectedWordDrawingContribution
  ): void => {
    const nextRenderer = readDrawingToolbarRenderer(options.editor);
    const locale = resolveDrawingContextualCommandLocale(options.overlayHost);
    const nextIdentity = JSON.stringify([
      selected.attrs.objectId, selected.attrs.drawing.drawingId, selected.hasTextStory, locale
    ]);
    const next: CreateDrawingCommandCardOptions = {
      toolbarRenderer: nextRenderer,
      disabled: !options.editor.isEditable,
      rect,
      hasTextStory: selected.hasTextStory,
      attrs: selected.attrs,
      locale,
      onAttrsChange: (patch) =>
        options.onAttrsChange(patch, selected.anchorPosition),
      onEnterText: options.onEnterText,
      onDelete: () => options.onDelete(selected.anchorPosition),
      onOpenMenuChange: (command) => {
        openMenuCommand = command;
        if (command === null || command !== openCustomColorCommand) {
          openCustomColorCommand = null;
        }
      },
      openCustomColorCommand,
      onCustomColorOpenChange: (command) => {
        openCustomColorCommand = command;
      }
    };
    // Keep the product's color editor and focused input alive through appearance commits.
    if (card && nextRenderer && renderer === nextRenderer && identity === nextIdentity) {
      card.update(next);
    } else {
      remove(true);
      card = createDrawingCommandCard(options.overlayHost.ownerDocument, next);
      options.overlayHost.append(card.element);
    }
    renderer = nextRenderer;
    identity = nextIdentity;
    if (openMenuCommand !== null) {
      card.openMenu(openMenuCommand);
    }
  };

  /** @returns Whether a proven selected drawing owns contextual chrome. */
  const refresh = (): boolean => {
      if (destroyed) {
        return false;
      }
      const selected = resolveSelectedWordDrawingContribution(options);
      if (selected === undefined || options.isSuppressed?.()) {
        remove();
        return false;
      }
      mount(selected.contribution.rect, selected);
      return true;
  };
  const releaseRenderer = observeDrawingToolbarRenderer(options.editor, refresh);
  return {
    refresh,
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      releaseRenderer();
      remove();
    }
  };
}

/** Exact selected contribution facts used by command-card presentation. */
interface SelectedWordDrawingContribution {
  /** Retained selected-object contribution carrying accepted geometry. */
  readonly contribution: QuireRetainedLayerContribution;
  /** Whether the exact source anchor references an editable story. */
  readonly hasTextStory: boolean;
  /** Current canonical drawing layout attributes. */
  readonly attrs: DrawingAnchor;
  /** Position immediately before the exact source anchor. */
  readonly anchorPosition: number;
}

/**
 * Resolves exact Word selection and matching retained selected occurrence.
 *
 * @param options - Current editor and retained snapshot authorities.
 * @returns Exact contribution facts, or undefined without proven ownership.
 */
function resolveSelectedWordDrawingContribution(
  options: CreateMountedDrawingContextualCommandsControllerOptions
): SelectedWordDrawingContribution | undefined {
  const selection = options.editor.state.pm.selection;
  const snapshot = options.getInteractionSnapshot();
  if (
    options.status !== "primary"
    || snapshot === undefined
    || snapshot.state.pm.doc !== options.editor.state.pm.doc
  ) {
    return undefined;
  }
  const contribution = snapshot.layerContributions?.find((candidate) =>
    candidate.activation?.kind === "selected-owner"
    && isSelectionInsideSelectedOwner(candidate, selection)
  );
  const anchorPosition = contribution?.owner.source.range?.from;
  const anchor = anchorPosition === undefined
    ? undefined
    : options.editor.state.pm.doc.nodeAt(anchorPosition);
  const attrs = anchor === undefined || anchor === null
    ? undefined
    : readMountedDrawingModel(options.editor).readAnchor(anchor.attrs);
  return contribution === undefined
    || anchorPosition === undefined
    || attrs === undefined
    || attrs.drawing.kind === "picture"
    || attrs.drawing.kind === "embedded"
    ? undefined
    : {
    contribution,
    hasTextStory: attrs.storyId !== null,
    attrs,
    anchorPosition
  };
}

/**
 * Reports whether the current selection owns the drawing rather than its text story.
 *
 * @param contribution - Candidate selected-owner retained contribution.
 * @param selection - Current ProseMirror selection.
 * @returns Whether object chrome should remain mounted for this contribution.
 */
function isSelectionInsideSelectedOwner(
  contribution: QuireRetainedLayerContribution,
  selection: { readonly from: number; readonly to: number }
): boolean {
  return selection instanceof NodeSelection
    && selection.from === contribution.range.from
    && selection.to === contribution.range.to;
}
