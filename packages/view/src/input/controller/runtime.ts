import type { QuireEditor } from "@quirekit/core";
import type { Transaction } from "@quirekit/pm";
import {
  resolveQuireCommandRoutingScope,
  resolveQuireDocumentProfile,
  type QuireActiveSelectionContext,
  type QuireCommandRoutingScope,
  type QuireInteractionSelectionTarget
} from "@quirekit/view-engine";
import type {
  QuireCompositionInputEvent,
  QuireEditorInputControllerOptions,
  QuireEditorInputResult,
  QuireKeyboardInputEvent,
  QuireClipboardOutputStrategy,
  QuireLineBoundaryPositionResolver,
  QuireVerticalCaretPositionResolver
} from "../types";
import {
  resolveQuireStoryCommandBoundary,
  type QuireStoryCommandBoundary
} from "../story-boundary";
import type { QuireRetainedLayoutSnapshot } from "@quirekit/view-engine";
import {
  resolveQuireSelectionScopeBoundary,
  type QuireSelectionScopeBoundary
} from "../selection-scope";
import { QuireInputCompositionState } from "./composition-state";
import {
  dispatchQuireCompositionDomEvent,
  type QuireInputPluginEventContext
} from "./events/plugin";
import { createQuireControllerEditorViewBridge } from "./dispatch/editor-view";
import { dispatchQuireControllerKeyDown } from "./dispatch/keyboard";
import {
  captureQuireControllerInputResult,
  dispatchQuireControllerTransaction
} from "./dispatch/transaction";

/** Runtime state and callbacks shared by input-controller handlers. */
export interface QuireEditorInputControllerRuntime {
  /** Editor that receives transactions produced by input handling. */
  readonly editor: QuireEditor;
  /** Mutable IME composition state owned by this controller. */
  readonly composition: QuireInputCompositionState;
  /** Optional layout-aware resolver for ArrowUp and ArrowDown fallback movement. */
  readonly resolveVerticalCaretPosition:
    | QuireVerticalCaretPositionResolver
    | undefined;
  /** Optional layout-aware resolver for Home and End visual-line boundaries. */
  readonly resolveLineBoundaryPosition:
    | QuireLineBoundaryPositionResolver
    | undefined;
  /** Reads the active selection context that should route commands before raw hit fallback. */
  readonly getSelectionContext:
    | (() => QuireActiveSelectionContext | null | undefined)
    | undefined;
  /** Reads the active interaction target that should route commands before PM fallback. */
  readonly getInteractionTarget:
    | (() => QuireInteractionSelectionTarget | null | undefined)
    | undefined;
  /** Reads the latest canonical interaction snapshot for transfer ownership. */
  readonly getInteractionSnapshot:
    | (() => QuireRetainedLayoutSnapshot | undefined)
    | undefined;
  /** Optional mounted-backend strategy for realizing clipboard MIME products. */
  readonly clipboardOutputStrategy?: QuireClipboardOutputStrategy | undefined;
  /**
   * Resolves the active command routing scope.
   *
   * @returns Command routing scope for the current selection and interaction target.
   */
  readonly resolveCommandRoutingScope: () => QuireCommandRoutingScope;
  /**
   * Resolves the live header/footer boundary for the current input command.
   *
   * @returns Active story boundary, or null for ordinary document input.
   */
  readonly resolveStoryCommandBoundary: () => QuireStoryCommandBoundary | null;
  /**
   * Resolves the active body or auxiliary-story selection boundary.
   *
   * @returns Active selectable source boundary, or null without exact scope.
   */
  readonly resolveSelectionScopeBoundary: () =>
    QuireSelectionScopeBoundary | null;
  /**
   * Routes a keyboard event through PM props and canvas fallbacks.
   *
   * @param event - Keyboard event-like object.
   * @returns Whether the key was handled.
   */
  readonly dispatchKeyDown: (event: QuireKeyboardInputEvent) => boolean;
  /**
   * Dispatches a PM transaction while applying controller-local composition meta.
   *
   * @param transaction - Transaction to dispatch.
   */
  readonly dispatchTransaction: (transaction: Transaction) => void;
  /**
   * Captures an input mutation and reports whether it changed the document.
   *
   * @param dispatch - Mutation callback that may dispatch transactions.
   * @param compositionId - Optional PM composition id.
   * @returns Input result describing handling and document changes.
   */
  readonly captureInputResult: (
    dispatch: () => boolean,
    compositionId?: number
  ) => QuireEditorInputResult;
  /**
   * Creates context shared by PM-compatible input plugin dispatchers.
   *
   * @returns Editor and view bridge factory for plugin event dispatch.
   */
  readonly createPluginEventContext: () => QuireInputPluginEventContext;
  /**
   * Dispatches a synthetic composition DOM event to PM plugin props.
   *
   * @param type - Composition event type.
   * @param event - DOM-light composition event payload.
   * @returns Whether any plugin handled the event.
   */
  readonly dispatchCompositionDomEvent: (
    type: "compositionstart" | "compositionupdate" | "compositionend",
    event?: QuireCompositionInputEvent
  ) => boolean;
}

/**
 * Creates shared input-controller runtime state.
 *
 * @param options - Input controller options.
 * @returns Runtime used by public controller methods and handlers.
 */
export function createQuireEditorInputControllerRuntime(
  options: QuireEditorInputControllerOptions
): QuireEditorInputControllerRuntime {
  const composition = new QuireInputCompositionState(options.composing ?? false);

  const runtime: QuireEditorInputControllerRuntime = {
    editor: options.editor,
    composition,
    resolveVerticalCaretPosition: options.resolveVerticalCaretPosition,
    resolveLineBoundaryPosition: options.resolveLineBoundaryPosition,
    getSelectionContext: options.getSelectionContext,
    getInteractionTarget: options.getInteractionTarget,
    getInteractionSnapshot: options.getInteractionSnapshot,
    clipboardOutputStrategy: options.clipboardOutputStrategy,
    resolveCommandRoutingScope() {
      const selectionContext =
        runtime.getSelectionContext?.() ?? undefined;

      return resolveQuireCommandRoutingScope({
        selection: runtime.editor.state.pm.selection,
        selectionContext,
        interactionTarget: runtime.getInteractionTarget?.() ?? undefined
      });
    },
    resolveStoryCommandBoundary() {
      return resolveQuireStoryCommandBoundary(
        runtime.resolveCommandRoutingScope(),
        runtime.editor.state.doc
      );
    },
    resolveSelectionScopeBoundary() {
      return resolveQuireSelectionScopeBoundary(
        runtime.resolveCommandRoutingScope(),
        runtime.editor.state.doc,
        resolveQuireDocumentProfile(runtime.editor.extensionManager).pageModel
      );
    },
    dispatchKeyDown(event) {
      return dispatchQuireControllerKeyDown(runtime, event);
    },
    dispatchTransaction(transaction) {
      dispatchQuireControllerTransaction(runtime, transaction);
    },
    captureInputResult(dispatch, compositionId) {
      return captureQuireControllerInputResult(runtime, dispatch, compositionId);
    },
    createPluginEventContext() {
      return {
        editor: runtime.editor,
        createEditorView: () => createQuireControllerEditorViewBridge(runtime)
      };
    },
    dispatchCompositionDomEvent(type, event) {
      return dispatchQuireCompositionDomEvent(
        runtime.createPluginEventContext(),
        type,
        event,
        runtime.composition.composing
      );
    }
  };

  return runtime;
}
