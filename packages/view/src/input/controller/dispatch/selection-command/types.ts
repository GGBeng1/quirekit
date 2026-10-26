import type {
  QuireInteractionDiagnostics,
  QuireSelectionCommandRoute
} from "@quirekit/view-engine";
import type { QuireClipboardEvent } from "../../../types";
import type { QuireEditorInputControllerRuntime } from "../../runtime";

/** Observable effect produced by a selection command consumer. */
export type QuireSelectionCommandEffect =
  | "blocked-readonly"
  | "blocked-structural"
  | "blocked-capability"
  | "copy-only"
  | "document-change"
  | "fallback"
  | "missing-command-capability"
  | "missing-command-source"
  | "missing-clipboard-data"
  | "selection-mismatch"
  | "unknown-target"
  | "unsupported-action";

/** Fallback surface selected when selection command dispatch defers ownership. */
export type QuireSelectionCommandFallback = "generic-edit";

/**
 * Route facts copied onto every selection command dispatch result.
 */
export interface QuireSelectionCommandResultRouteFacts {
  /**
   * Route family selected for the active command.
   */
  readonly routeKind: QuireSelectionCommandRoute["kind"];

  /**
   * Selection command intent that was dispatched.
   */
  readonly intent: QuireSelectionCommandRoute["intent"];

  /**
   * Selection domain that owned command interpretation.
   */
  readonly selectionDomain: QuireSelectionCommandRoute["selectionDomain"];

  /**
   * Concrete command target class that produced the route.
   */
  readonly targetKind: QuireSelectionCommandRoute["targetKind"];

  /**
   * Retained root that owns the active command target, when known.
   */
  readonly activeRoot?: QuireSelectionCommandRoute["activeRoot"];

  /**
   * Retained region that owns the active command target, when known.
   */
  readonly activeRegion?: QuireSelectionCommandRoute["activeRegion"];

  /**
   * Source document identity represented by the active command target, when known.
   */
  readonly activeSource?: QuireSelectionCommandRoute["activeSource"];

  /**
   * Capabilities active for the active command target, when known.
   */
  readonly activeCapabilities?: QuireSelectionCommandRoute["activeCapabilities"];

  /**
   * Interaction target that produced the route, when available.
   */
  readonly interactionTarget?: QuireSelectionCommandRoute["interactionTarget"];

  /**
   * Unified diagnostics describing the command-route authority path.
   */
  readonly diagnostics?: QuireInteractionDiagnostics | undefined;
}

/**
 * Result returned when a selection command domain handled an intent.
 */
export interface QuireSelectionCommandHandledResult
  extends QuireSelectionCommandResultRouteFacts {
  /**
   * Whether the selection command consumed the command.
   */
  readonly handled: true;

  /**
   * Whether handling changed the ProseMirror document.
   */
  readonly docChanged: boolean;

  /**
   * Stable consumer that handled this command.
   */
  readonly consumer: string;

  /**
   * Observable command effect produced by the consumer.
   */
  readonly effect: Exclude<QuireSelectionCommandEffect, "fallback">;
}

/**
 * Result returned when the selection command dispatcher did not own an intent.
 */
export interface QuireSelectionCommandUnhandledResult
  extends QuireSelectionCommandResultRouteFacts {
  /**
   * Whether the selection command consumed the command.
   */
  readonly handled: false;

  /**
   * Fallback surface that should receive the command next.
   */
  readonly fallback: QuireSelectionCommandFallback;
}

/**
 * Selection command dispatch result before generic fallback.
 */
export type QuireSelectionCommandDispatchResult =
  | QuireSelectionCommandHandledResult
  | QuireSelectionCommandUnhandledResult;

/**
 * Context passed to a selection-domain command pipeline dispatch.
 */
export interface QuireSelectionDomainCommandDispatchOptions {
  /**
   * Shared input-controller runtime.
   */
  readonly runtime: QuireEditorInputControllerRuntime;

  /**
   * Routed selection command facts.
   */
  readonly commandRoute: QuireSelectionCommandRoute;

  /**
   * Clipboard event when the command came from copy, cut, or paste.
   */
  readonly clipboardEvent?: QuireClipboardEvent | undefined;
}

/**
 * Internal selection-domain command consumer contract.
 */
export interface QuireSelectionDomainCommandConsumer {
  /**
   * Stable consumer label for diagnostics and tests.
   */
  readonly name: string;

  /**
   * Command intents handled by this consumer.
   */
  readonly intents: readonly QuireSelectionCommandRoute["intent"][];

  /**
   * Route families handled by this consumer.
   */
  readonly routeKinds: readonly QuireSelectionCommandRoute["kind"][];

  /**
   * Handles a routed selection-domain command.
   *
   * @param options - Routed command context.
   * @returns Selection-domain dispatch result.
   */
  readonly handle: (
    options: QuireSelectionDomainCommandDispatchOptions
  ) => QuireSelectionCommandDispatchResult;
}
