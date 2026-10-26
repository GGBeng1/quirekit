import {
  createQuireInteractionCommandRouteDiagnostics
} from "@quirekit/view-engine";
import type { QuireSelectionCommandRoute } from "@quirekit/view-engine";
import type { QuireEditorInputResult } from "../../../types";
import type {
  QuireSelectionCommandDispatchResult,
  QuireSelectionCommandEffect,
  QuireSelectionCommandFallback,
  QuireSelectionCommandHandledResult,
  QuireSelectionCommandResultRouteFacts,
  QuireSelectionCommandUnhandledResult
} from "./types";

/**
 * Options used to create a handled selection command result.
 */
export interface QuireCreateSelectionCommandHandledResultOptions {
  /**
   * Stable consumer that handled this command.
   */
  readonly consumer: string;

  /**
   * Observable command effect produced by the consumer.
   */
  readonly effect: Exclude<QuireSelectionCommandEffect, "fallback">;

  /**
   * Whether handling changed the ProseMirror document.
   */
  readonly docChanged: boolean;
}

/**
 * Creates a handled selection command result with route diagnostics.
 *
 * @param commandRoute - Routed selection command facts.
 * @param options - Consumer result facts.
 * @returns Handled selection command result.
 */
export function createQuireSelectionCommandHandledResult(
  commandRoute: QuireSelectionCommandRoute,
  options: QuireCreateSelectionCommandHandledResultOptions
): QuireSelectionCommandHandledResult {
  return {
    ...createQuireSelectionCommandResultRouteFacts(commandRoute, {
      consumer: options.consumer,
      effect: options.effect
    }),
    handled: true,
    docChanged: options.docChanged,
    consumer: options.consumer,
    effect: options.effect
  };
}

/**
 * Creates an unhandled selection command result with route diagnostics.
 *
 * @param commandRoute - Routed selection command facts.
 * @param fallback - Fallback surface selected for the route.
 * @returns Unhandled selection command result.
 */
export function createQuireSelectionCommandUnhandledResult(
  commandRoute: QuireSelectionCommandRoute,
  fallback: QuireSelectionCommandFallback = "generic-edit"
): QuireSelectionCommandUnhandledResult {
  return {
    ...createQuireSelectionCommandResultRouteFacts(commandRoute, { fallback }),
    handled: false,
    fallback
  };
}

/**
 * Reads a handled selection-command result as a controller input result.
 *
 * @param result - Selection command dispatch result to adapt.
 * @returns Controller input result, or null when selection dispatch was unhandled.
 */
export function readQuireSelectionCommandInputResult(
  result: QuireSelectionCommandDispatchResult
): QuireEditorInputResult | null {
  if (!result.handled) {
    return null;
  }

  return { handled: true, docChanged: result.docChanged };
}

/**
 * Creates route facts shared by handled and unhandled dispatch results.
 *
 * @param commandRoute - Routed selection command facts.
 * @returns Route facts copied onto dispatch results.
 */
function createQuireSelectionCommandResultRouteFacts(
  commandRoute: QuireSelectionCommandRoute,
  outcome: {
    readonly consumer?: string | undefined;
    readonly effect?: string | undefined;
    readonly fallback?: string | undefined;
  } = {}
): QuireSelectionCommandResultRouteFacts {
  return {
    routeKind: commandRoute.kind,
    intent: commandRoute.intent,
    selectionDomain: commandRoute.selectionDomain,
    targetKind: commandRoute.targetKind,
    activeRoot: commandRoute.activeRoot,
    activeRegion: commandRoute.activeRegion,
    activeSource: commandRoute.activeSource,
    activeCapabilities: commandRoute.activeCapabilities,
    interactionTarget: commandRoute.interactionTarget,
    diagnostics: createQuireInteractionCommandRouteDiagnostics({
      routeKind: commandRoute.kind,
      intent: commandRoute.intent,
      selectionDomain: commandRoute.selectionDomain,
      targetKind: commandRoute.targetKind,
      activeRoot: commandRoute.activeRoot,
      activeRegion: commandRoute.activeRegion,
      interactionTarget: commandRoute.interactionTarget,
      consumer: outcome.consumer,
      effect: outcome.effect,
      fallback: outcome.fallback
    })
  };
}
