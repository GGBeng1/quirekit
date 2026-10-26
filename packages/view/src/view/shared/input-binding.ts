import {
  createQuireEditorInputBinding,
  type QuireEditorInputBinding,
  type QuireEditorInputBindingUpdate
} from "../../input";
import type {
  QuireActiveSelectionContext,
  QuireInteractionSelectionTarget
} from "@quirekit/view-engine";
import type { QuireImePreedit } from "@quirekit/view-engine";
import type { QuireRetainedLayoutSnapshot } from "@quirekit/view-engine";
import type { QuireEditor } from "@quirekit/core";
import type { QuireClipboardOutputStrategy } from "../../input";
import type { QuireEditorViewStatus } from "./types";

/** Render reason produced by mounted input binding callbacks. */
export type MountedInputBindingRenderReason =
  | QuireEditorInputBindingUpdate["reason"]
  | "composition";

/** Options used to create an editable mounted view input binding. */
export interface CreateMountedInputBindingOptions {
  /** Optional backend-owned visual navigation using the same geometry as pointer selection. */
  readonly navigation?: import("../../input/types").QuireEditorInputBindingOptions["navigation"];
  /** Mounted view status that controls editability. */
  readonly status: QuireEditorViewStatus;
  /** Editor receiving transactions from input events. */
  readonly editor: QuireEditor;
  /** Hidden textarea input proxy owned by the mounted view. */
  readonly inputProxy: HTMLTextAreaElement;
  /**
   * Reads combined editor, mounted-status, and plugin editability.
   *
   * @returns Whether browser editing events may enter this mounted view.
   */
  readonly readEditable: () => boolean;
  /**
   * Reads the current interaction geometry snapshot.
   *
   * @returns Current interaction geometry snapshot when the view has rendered.
   */
  readonly getInteractionSnapshot: () => QuireRetainedLayoutSnapshot | undefined;
  /** Optional mounted-backend strategy for realizing clipboard MIME products. */
  readonly clipboardOutputStrategy?: QuireClipboardOutputStrategy | undefined;
  /**
   * Reads the active selection context for command routing.
   *
   * @returns Active selection context, null when none is active, or undefined before pointer state exists.
   */
  readonly getSelectionContext?:
    | (() => QuireActiveSelectionContext | null | undefined)
    | undefined;
  /**
   * Reads the active interaction target for command routing.
   *
   * @returns Active interaction target, null when none is active, or undefined before pointer state exists.
   */
  readonly getInteractionTarget?:
    | (() => QuireInteractionSelectionTarget | null | undefined)
    | undefined;
  /**
   * Reports whether the current mounted interaction mode permits browser input.
   *
   * @returns Whether keyboard, clipboard, and IME routing may continue.
   */
  readonly shouldRouteInput?: (() => boolean) | undefined;
  /**
   * Lets a mounted interaction mode consume keydown before ordinary commands.
   *
   * @param event - Browser keyboard event received by the input proxy.
   * @returns Whether the mode consumed the event.
   */
  readonly handleKeyDownBeforeCommand?:
    | ((event: KeyboardEvent) => boolean)
    | undefined;
  /**
   * Called when the input proxy blurs or another mounted view claims ownership.
   *
   * @param event - Blur event; absent when another mounted view claimed ownership.
   */
  readonly onInputOwnershipLost?: ((event?: FocusEvent) => void) | undefined;
  /**
   * Requests a mounted view render pass after input handling.
   *
   * @param reason - Render reason emitted by the input binding.
   * @param imePreedit - Optional IME preedit.
   */
  readonly render: (
    reason: MountedInputBindingRenderReason,
    imePreedit?: QuireImePreedit | undefined
  ) => void;
  /**
   * Observes mounted focus changes.
   *
   * @param focused - Whether the input proxy has focus.
   */
  readonly onFocusChange: (focused: boolean) => void;
}

/**
 * Creates the shared input binding used by editable mounted views.
 *
 * @param options - Mounted status, editor, input proxy, and render callbacks.
 * @returns Input binding for editable views, or undefined for locked views.
 */
export function createMountedInputBinding(
  options: CreateMountedInputBindingOptions
): QuireEditorInputBinding | undefined {
  return options.status === "lock"
    ? undefined
    : createQuireEditorInputBinding({
        editor: options.editor,
        inputProxy: options.inputProxy,
        navigation: options.navigation,
        readEditable: options.readEditable,
        getInteractionSnapshot: options.getInteractionSnapshot,
        clipboardOutputStrategy: options.clipboardOutputStrategy,
        getSelectionContext: options.getSelectionContext,
        getInteractionTarget: options.getInteractionTarget,
        shouldRouteInput: options.shouldRouteInput,
        handleKeyDownBeforeCommand: options.handleKeyDownBeforeCommand,
        onInputOwnershipLost: options.onInputOwnershipLost,
        // Input dispatches a transaction through the editor, and the editor's
        // updateMountedViews already re-renders every mounted view — so the
        // binding must not render again here, or each keystroke renders the
        // focused view twice. IME preedit is view-local overlay state,
        // so it still needs a render even though it mutates no document.
        onImePreedit: (imePreedit) => {
          options.render("composition", imePreedit);
        },
        onFocusChange: options.onFocusChange
      });
}
