import type { QuireEditor } from "@quirekit/core";
import { Slice, type Transaction } from "@quirekit/pm";
import {
  pasteQuireClipboardSlice,
  pasteQuireClipboardText,
  readQuireClipboardSlice,
  runQuireClipboardPasteHandlers
} from "@quirekit/clipboard";
import type { QuireClipboardEvent, QuireEditorInputResult } from "../../types";
import { createClipboardEvent } from "./dom";
import type { QuireRetainedLayoutSnapshot } from "@quirekit/view-engine";
import type { QuireCommandRoutingScope } from "@quirekit/view-engine";
import type { QuireClipboardOutputStrategy } from "../../types";
import { writeQuireOwnedClipboardSelection } from "../../clipboard/selection";
import { writeQuireStoryClipboardSelection } from "../../clipboard/story";
import type { QuireStoryCommandBoundary } from "../../story-boundary";

/** Shared controller context used by clipboard handlers. */
export interface QuireControllerClipboardContext {
  /** Editor that owns the selection and receives transactions. */
  readonly editor: QuireEditor;
  /** Reads the latest canonical interaction snapshot for transfer ownership. */
  readonly getInteractionSnapshot?:
    (() => QuireRetainedLayoutSnapshot | undefined) | undefined;
  /** Active command route used for exact retained-owner lookup. */
  readonly commandScope?: QuireCommandRoutingScope | undefined;
  /** Optional mounted-backend strategy for realizing clipboard MIME products. */
  readonly clipboardOutputStrategy?: QuireClipboardOutputStrategy | undefined;
  /** Active header/footer boundary used to normalize story clipboard slices. */
  readonly storyCommandBoundary?: QuireStoryCommandBoundary | undefined;
  /**
   * Captures an input mutation and reports whether the document changed.
   *
   * @param dispatch - Mutation callback that may dispatch transactions.
   * @returns Input result for the mutation.
   */
  readonly captureInputResult: (dispatch: () => boolean) => QuireEditorInputResult;
  /**
   * Dispatches a transaction through the input controller.
   *
   * @param transaction - Transaction to apply.
   */
  readonly dispatchTransaction: (transaction: Transaction) => void;
}

/**
 * Handles copying the current editor selection as rich clipboard data.
 *
 * @param context - Editor context for clipboard serialization.
 * @param event - Clipboard event carrying a writable data adapter.
 * @returns Whether copy data was written.
 */
export function handleQuireControllerCopy(
  context: Pick<
    QuireControllerClipboardContext,
    | "editor"
    | "getInteractionSnapshot"
    | "commandScope"
    | "clipboardOutputStrategy"
    | "storyCommandBoundary"
  >,
  event: QuireClipboardEvent
): QuireEditorInputResult {
  if (!event.clipboardData) {
    return { handled: false, docChanged: false };
  }

  const handled = context.storyCommandBoundary === undefined
    ? writeQuireOwnedClipboardSelection({
        editor: context.editor,
        snapshot: context.getInteractionSnapshot?.(),
        scope: context.commandScope,
        outputStrategy: context.clipboardOutputStrategy,
        clipboardData: event.clipboardData
      }).handled
    : writeQuireStoryClipboardSelection({
        editor: context.editor,
        boundary: context.storyCommandBoundary,
        clipboardData: event.clipboardData
      });

  if (!handled) {
    return { handled: false, docChanged: false };
  }

  event.preventDefault?.();

  return { handled: true, docChanged: false };
}

/**
 * Handles cutting the current editor selection as rich clipboard data.
 *
 * @param context - Editor context and transaction callbacks.
 * @param event - Clipboard event carrying a writable data adapter.
 * @returns Whether cut data was written and the selection deleted.
 */
export function handleQuireControllerCut(
  context: QuireControllerClipboardContext,
  event: QuireClipboardEvent
): QuireEditorInputResult {
  if (!event.clipboardData) {
    return { handled: false, docChanged: false };
  }

  return context.captureInputResult(() => {
    const handled = context.storyCommandBoundary === undefined
      ? writeQuireOwnedClipboardSelection({
          editor: context.editor,
          snapshot: context.getInteractionSnapshot?.(),
          scope: context.commandScope,
          outputStrategy: context.clipboardOutputStrategy,
          clipboardData: event.clipboardData!
        }).handled
      : writeQuireStoryClipboardSelection({
          editor: context.editor,
          boundary: context.storyCommandBoundary,
          clipboardData: event.clipboardData!
        });

    if (!handled) {
      return false;
    }

    event.preventDefault?.();
    context.dispatchTransaction(context.editor.state.pm.tr.deleteSelection());
    return true;
  });
}

/**
 * Handles pasting rich clipboard data into the current editor selection.
 *
 * @param context - Editor context and mutation callback.
 * @param event - Clipboard event carrying readable data.
 * @returns Whether paste data was inserted.
 */
export function handleQuireControllerPaste(
  context: QuireControllerClipboardContext,
  event: QuireClipboardEvent
): QuireEditorInputResult {
  if (event.clipboardData) {
    const richSlice = readQuireClipboardSlice({
      editor: context.editor,
      clipboardData: event.clipboardData
    });

    if (richSlice) {
      const result = context.captureInputResult(() => {
        return pasteQuireClipboardSlice(
          context.editor,
          richSlice,
          createClipboardEvent(event)
        );
      });

      if (result.handled) {
        event.preventDefault?.();
      }

      return result;
    }
  }

  const text = event.clipboardData?.getData("text/plain") || event.inputValue || "";

  if (text.length === 0) {
    const result = context.captureInputResult(() =>
      runQuireClipboardPasteHandlers(
        context.editor,
        Slice.empty,
        createClipboardEvent(event)
      )
    );
    if (result.handled) {
      event.preventDefault?.();
    }
    return result;
  }

  const result = context.captureInputResult(() => {
    return pasteQuireClipboardText(context.editor, text, createClipboardEvent(event));
  });

  if (result.handled) {
    event.preventDefault?.();
  }

  return result;
}
