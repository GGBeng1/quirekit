import type { QuireClipboardData } from "@quirekit/clipboard";
import type { QuireEditor } from "@quirekit/core";
import type { QuireDocumentPosition } from "@quirekit/renderer";
import type { QuireRect } from "@quirekit/renderer";
import type {
  QuireClientRect,
  QuireActiveSelectionContext,
  QuireInteractionSelectionTarget
} from "@quirekit/view-engine";
import type { QuireImePreedit } from "@quirekit/view-engine";
import type { QuireRetainedLayoutSnapshot } from "@quirekit/view-engine";
import type { QuireTextContextHost } from "./text-context/types";

/** Inputs consumed by an internal mounted-view clipboard output strategy. */
export interface QuireClipboardOutputOptions {
  /** Editor whose current semantic selection is copied. */
  readonly editor: QuireEditor;
  /** Clipboard adapter receiving standard MIME products. */
  readonly clipboardData: QuireClipboardData;
}

/** Internal mounted-view strategy that realizes standard clipboard MIME products. */
export type QuireClipboardOutputStrategy = (
  options: QuireClipboardOutputOptions
) => boolean;

/** Vertical direction requested by keyboard caret navigation. */
export type QuireVerticalCaretDirection = "up" | "down";

/** Horizontal visual-line boundary requested by keyboard caret navigation. */
export type QuireLineBoundaryDirection = "start" | "end";

/** User intent that requested boundary caret navigation. */
export type QuireBoundaryCaretIntent = "move" | "extend";

/** Context used to resolve a layout-aware caret target. */
export interface QuireCaretPositionResolveContext {
  /** Document position that should be treated as the current moving caret side. */
  readonly position: QuireDocumentPosition;
  /** Whether the navigation will collapse/move the selection or extend it. */
  readonly intent: QuireBoundaryCaretIntent;
}

/**
 * Resolves a layout-aware caret target for vertical keyboard navigation.
 *
 * @param direction - Vertical movement direction requested by keyboard input.
 * @param context - Moving caret side and intent for this navigation request.
 * @returns Resolved document position, or null when the view cannot move vertically.
 */
export type QuireVerticalCaretPositionResolver = (
  direction: QuireVerticalCaretDirection,
  context: QuireCaretPositionResolveContext
) => QuireDocumentPosition | null;

/**
 * Resolves a layout-aware visual-line boundary target for keyboard navigation.
 *
 * @param direction - Visual-line boundary requested by keyboard input.
 * @param context - Moving caret side and intent for this navigation request.
 * @returns Resolved document position, or null when the view cannot resolve the line.
 */
export type QuireLineBoundaryPositionResolver = (
  direction: QuireLineBoundaryDirection,
  context: QuireCaretPositionResolveContext
) => QuireDocumentPosition | null;

/** Options used to create a canvas editor input controller. */
export interface QuireEditorInputControllerOptions {
  /** Editor that receives transactions produced by input handling. */
  readonly editor: QuireEditor;
  /** Whether the editor is currently processing IME composition. */
  readonly composing?: boolean;
  /** Optional layout-aware resolver for ArrowUp and ArrowDown fallback movement. */
  readonly resolveVerticalCaretPosition?: QuireVerticalCaretPositionResolver;
  /** Optional layout-aware resolver for Home and End visual-line boundaries. */
  readonly resolveLineBoundaryPosition?: QuireLineBoundaryPositionResolver;
  /** Reads the active selection context that should route commands before raw hit fallback. */
  readonly getSelectionContext?:
    | (() => QuireActiveSelectionContext | null | undefined)
    | undefined;
  /** Reads the active interaction target that should route commands before PM fallback. */
  readonly getInteractionTarget?:
    | (() => QuireInteractionSelectionTarget | null | undefined)
    | undefined;
  /** Reads the latest canonical interaction snapshot for transfer ownership. */
  readonly getInteractionSnapshot?:
    (() => QuireRetainedLayoutSnapshot | undefined) | undefined;
  /** Optional mounted-backend strategy for realizing clipboard MIME products. */
  readonly clipboardOutputStrategy?: QuireClipboardOutputStrategy | undefined;
}

/** Minimal result returned by canvas input handlers. */
export interface QuireEditorInputResult {
  /** Whether the input event was handled by QuireKit. */
  readonly handled: boolean;
  /** Whether handling changed the editor document. */
  readonly docChanged: boolean;
}

/** Browser input source handled by a mounted canvas input binding. */
export type QuireEditorInputBindingSource =
  | "beforeinput"
  | "keydown"
  | "input"
  | "compositionend"
  | "cut"
  | "paste";

/** Update emitted after a mounted input binding changes editor state or selection. */
export interface QuireEditorInputBindingUpdate {
  /** Browser input source that produced this update. */
  readonly source: QuireEditorInputBindingSource;
  /** Result returned by the underlying canvas input controller. */
  readonly result: QuireEditorInputResult;
  /** Suggested mounted view update reason for the next render pass. */
  readonly reason: "transaction" | "selection";
}

/** Options used when clearing transient mounted input state. */
export interface QuireEditorInputResetOptions {
  /**
   * Whether to blur the native input host before the caller focuses it again.
   *
   * `true` forces a restart. `"if-needed"` restarts only when the native session
   * has observed IME activity since its last blur, including completed or
   * JS-canceled composition. Ordinary pointer selection can then preserve focus
   * without losing recovery from browser/OS composition residue.
   */
  readonly restartNativeInput?: boolean | "if-needed";
}

/** Options used to bind browser input events to one mounted editable view. */
export interface QuireEditorInputBindingOptions {
  /** Backend geometry for visual movement; DOM views must not use shaped-page coordinates. */
  readonly navigation?: Pick<QuireEditorInputControllerOptions,
    "resolveVerticalCaretPosition" | "resolveLineBoundaryPosition"
  > | undefined;
  /** Editor that receives transactions produced by input handling. */
  readonly editor: QuireEditor;
  /** Hidden textarea owned by the mounted view. */
  readonly inputProxy: HTMLTextAreaElement;
  /**
   * Reads whether the owning mounted view currently permits editing input.
   *
   * @returns Live editor, mounted-status, and plugin editability when available.
   */
  readonly readEditable?: (() => boolean) | undefined;
  /** Reads the latest interaction geometry snapshot for layout-aware keyboard movement. */
  readonly getInteractionSnapshot?:
    (() => QuireRetainedLayoutSnapshot | undefined) | undefined;
  /** Optional mounted-backend strategy for realizing clipboard MIME products. */
  readonly clipboardOutputStrategy?: QuireClipboardOutputStrategy | undefined;
  /** Reads the active selection context that should route commands before raw hit fallback. */
  readonly getSelectionContext?:
    | (() => QuireActiveSelectionContext | null | undefined)
    | undefined;
  /** Reads the active interaction target that should route commands before PM fallback. */
  readonly getInteractionTarget?:
    | (() => QuireInteractionSelectionTarget | null | undefined)
    | undefined;
  /**
   * Reports whether browser keyboard, clipboard, and IME events may route now.
   *
   * @returns Whether the current mounted interaction mode owns input.
   */
  readonly shouldRouteInput?: (() => boolean) | undefined;
  /**
   * Lets a mounted editing mode consume keydown before ordinary PM commands.
   *
   * @param event - Browser keyboard event received by the hidden input proxy.
   * @returns Whether the editing mode consumed the event.
   */
  readonly handleKeyDownBeforeCommand?:
    | ((event: KeyboardEvent) => boolean)
    | undefined;
  /**
   * Receives handled editing updates after transactions or selection changes.
   *
   * @param update - Mounted input update summary.
   */
  readonly onUpdate?: ((update: QuireEditorInputBindingUpdate) => void) | undefined;
  /**
   * Receives transient IME preedit changes that should be rendered without committing.
   *
   * @param preedit - IME preedit to show, or undefined to clear it.
   */
  readonly onImePreedit?:
    | ((preedit: QuireImePreedit | undefined) => void)
    | undefined;
  /**
   * Receives focus ownership changes for caret presentation.
   *
   * @param focused - Whether the input proxy is focused.
   */
  readonly onFocusChange?: ((focused: boolean) => void) | undefined;
  /**
   * Called when the input proxy blurs or another mounted binding claims ownership.
   *
   * @param event - Blur event; absent when another mounted binding claimed ownership.
   */
  readonly onInputOwnershipLost?: ((event?: FocusEvent) => void) | undefined;
}

/** Mounted input binding lifecycle object. */
export interface QuireEditorInputBinding extends Partial<QuireTextContextHost> {
  /** Focuses the hidden input proxy without exposing it to application code. */
  focus(): void;
  /** Blurs the hidden input proxy so browser input cannot mutate a stale selection. */
  blur(): void;
  /** Clears transient IME/input state without blurring the input proxy. */
  resetTransientState(options?: QuireEditorInputResetOptions): void;
  /** Removes browser event listeners owned by this binding. */
  destroy(): void;
}

/** Options used to place an editor input proxy near a logical caret rectangle. */
export interface QuireInputProxyPlacementOptions {
  /** Caret or selection rectangle in render-surface coordinates. */
  readonly anchor: QuireRect;
  /** Logical bounds used by the active render surface. */
  readonly surfaceBounds: QuireRect;
  /** Browser client rectangle for the active render surface. */
  readonly surfaceClientRect: QuireClientRect;
  /** Browser client rectangle for the positioned View root. */
  readonly positioningRootClientRect: QuireClientRect;
  /** Client CSS px per root-local CSS px when a host zooms or transforms the View; defaults to 1. */
  readonly positioningRootScale?: number;
  /** Minimum root-local CSS width that keeps the input proxy measurable. */
  readonly minWidth?: number;
  /** Minimum root-local CSS height that keeps the input proxy usable for IME. */
  readonly minHeight?: number;
}

/** CSS pixel rectangle used to place an editor input proxy. */
export interface QuireInputProxyPlacement {
  /** Left edge in View-root-local CSS pixels. */
  readonly left: number;
  /** Top edge in View-root-local CSS pixels. */
  readonly top: number;
  /** Width in View-root-local CSS pixels. */
  readonly width: number;
  /** Height in View-root-local CSS pixels. */
  readonly height: number;
}

/** DOM-light clipboard event shape consumed by canvas input handling. */
export interface QuireClipboardEvent {
  /** Clipboard payload adapter supplied by the browser event. */
  readonly clipboardData?: QuireClipboardData | null;
  /** Text value fallback read from the hidden input proxy. */
  readonly inputValue?: string | null;
  /**
   * Prevents the browser input proxy from applying its native clipboard edit.
   */
  readonly preventDefault?: () => void;
}

/** DOM-light beforeinput event shape consumed by canvas input handling. */
export interface QuireBeforeInputEvent {
  /** Input Events inputType value describing the requested edit. */
  readonly inputType: string;
  /** Text data associated with text insertion input types. */
  readonly data?: string | null;
  /** Whether the browser reports the input as part of IME composition. */
  readonly isComposing?: boolean;
  /**
   * Prevents the browser input proxy from applying its native edit.
   */
  readonly preventDefault?: () => void;
}

/** DOM-light composition event shape consumed by canvas input handling. */
export interface QuireCompositionInputEvent {
  /** Current or finalized composition text reported by the browser. */
  readonly data?: string | null;
}

/** DOM-light keyboard event shape consumed by canvas input handling. */
export interface QuireKeyboardInputEvent {
  /** KeyboardEvent key value. */
  readonly key: string;
  /** Legacy keyCode value used by vendored key-name normalization. */
  readonly keyCode?: number;
  /** Whether the browser reports the key as part of IME composition. */
  readonly isComposing?: boolean;
  /** Whether Alt was held. */
  readonly altKey?: boolean;
  /** Whether Control was held. */
  readonly ctrlKey?: boolean;
  /** Whether Meta was held. */
  readonly metaKey?: boolean;
  /** Whether Shift was held. */
  readonly shiftKey?: boolean;
  /**
   * Prevents the browser input proxy from applying its native edit.
   */
  readonly preventDefault?: () => void;
}
