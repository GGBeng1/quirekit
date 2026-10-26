import {
  AllSelection,
  NodeSelection,
  TextSelection
} from "@quirekit/pm";
import { BlockSelection } from "@quirekit/core";
import { readQuireTableCellSelection } from "../table/cell-selection";
import { QuireStructuredRangeSelection } from "./structured-range";
import type {
  QuireActiveSelectionContext,
  QuireActiveSelectionContextOptions,
  QuireInteractionSelectionTarget
} from "./types";
import type {
  QuireHitTestResult,
  QuireSelectionGeometryContext,
  QuireSelectionGeometryVisualContext
} from "../types";
import { resolveQuireHitTestSelectionTarget } from "./target";

/**
 * Resolves the active selection context used by input and command routing.
 *
 * @param options - Current PM selection plus optional retained interaction target.
 * @returns Active selection facts with domain and command target ownership.
 */
export function resolveQuireActiveSelectionContext(
  options: QuireActiveSelectionContextOptions
): QuireActiveSelectionContext {
  const { interactionTarget, selection } = options;

  if (readQuireTableCellSelection(selection) !== null) {
    return {
      selection,
      selectionDomain: "cell",
      commandTarget: "table-cells",
      activeRoot: interactionTarget?.region?.rootId,
      activeRegion: interactionTarget?.region,
      activeSource: interactionTarget?.source,
      activeCapabilities: interactionTarget?.capabilities,
      activeQueryOwner: interactionTarget?.queryOwner,
      activeReferenceRect: interactionTarget?.referenceRect,
      ...(interactionTarget === undefined ? {} : { interactionTarget })
    };
  }

  if (selection instanceof QuireStructuredRangeSelection || selection instanceof BlockSelection) {
    return {
      selection,
      selectionDomain: "document",
      commandTarget: "document"
    };
  }

  if (interactionTarget !== undefined) {
    return {
      selection,
      selectionDomain: interactionTarget.domain,
      commandTarget: interactionTarget.commandTarget,
      activeRoot: interactionTarget.region?.rootId,
      activeRegion: interactionTarget.region,
      activeSource: interactionTarget.source,
      activeCapabilities: interactionTarget.capabilities,
      activeQueryOwner: interactionTarget.queryOwner,
      activeReferenceRect: interactionTarget.referenceRect,
      interactionTarget
    };
  }

  if (selection instanceof TextSelection) {
    return {
      selection,
      selectionDomain: "text",
      commandTarget: "editable-text"
    };
  }

  if (selection instanceof NodeSelection) {
    return {
      selection,
      selectionDomain: "node",
      commandTarget: "node"
    };
  }

  if (selection instanceof AllSelection) {
    return {
      selection,
      selectionDomain: "document",
      commandTarget: "document"
    };
  }

  return {
    selection,
    selectionDomain: "unknown",
    commandTarget: "unknown"
  };
}

/**
 * Converts a retained interaction target into selection geometry context.
 *
 * @param target - Retained interaction target to convert, or null for a miss.
 * @returns Selection geometry context, or undefined when no retained facts exist.
 */
export function createQuireSelectionGeometryContextFromInteractionTarget(
  target: QuireInteractionSelectionTarget | null
): QuireSelectionGeometryContext | undefined {
  return createQuireSelectionGeometryVisualContextFromInteractionTarget(target);
}

/**
 * Converts retained range endpoint targets into one ordered visual context.
 *
 * Anchor precedes head so repeated-instance filtering can preserve the gesture
 * direction while the head remains the active context for caret and commands.
 *
 * @param anchorTarget - Retained target that produced the range anchor.
 * @param headTarget - Retained target that produced the moving range head.
 * @returns Range geometry context, or undefined when both endpoints lack facts.
 */
export function createQuireSelectionGeometryContextFromInteractionTargets(
  anchorTarget: QuireInteractionSelectionTarget | null,
  headTarget: QuireInteractionSelectionTarget | null
): QuireSelectionGeometryContext | undefined {
  const anchorContext =
    createQuireSelectionGeometryVisualContextFromInteractionTarget(anchorTarget);
  const headContext =
    createQuireSelectionGeometryVisualContextFromInteractionTarget(headTarget);
  const visualContexts = [
    ...(anchorContext === undefined ? [] : [anchorContext]),
    ...(headContext === undefined ? [] : [headContext])
  ];
  const activeContext = headContext ?? anchorContext;

  if (activeContext === undefined) {
    return undefined;
  }

  return {
    ...activeContext,
    visualContexts
  };
}

/**
 * Converts an interaction hit-test result into selection geometry context.
 *
 * @param hitTestResult - Hit-test result produced by interaction geometry.
 * @returns Selection geometry context, or undefined when the hit missed.
 */
export function createQuireSelectionGeometryContextFromHitTestResult(
  hitTestResult: QuireHitTestResult
): QuireSelectionGeometryContext | undefined {
  return createQuireSelectionGeometryContextFromInteractionTarget(
    resolveQuireHitTestSelectionTarget({ hitTestResult })
  );
}

/**
 * Converts one interaction target into a retained visual context.
 *
 * @param target - Interaction target to convert.
 * @returns Retained visual context, or undefined without a target.
 */
export function createQuireSelectionGeometryVisualContextFromInteractionTarget(
  target: QuireInteractionSelectionTarget | null
): QuireSelectionGeometryVisualContext | undefined {
  if (target === null) {
    return undefined;
  }

  return {
    ...(target.region === undefined ? {} : { viewRegion: target.region }),
    ...(target.queryOwner === undefined ? {} : { queryOwner: target.queryOwner }),
    ...(target.source === undefined ? {} : { ownerSource: target.source }),
    ...(target.capabilities === undefined
      ? {}
      : { ownerCapabilities: target.capabilities }),
    ...(target.referenceRect === undefined
      ? {}
      : { referenceRect: target.referenceRect })
  };
}
