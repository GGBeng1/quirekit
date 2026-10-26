import type { DrawingAnchor, DrawingAnchorPatch } from "@quirekit/drawing-geometry";
import type { QuireRect } from "@quirekit/renderer";
import type { QuireDrawingToolbarRenderer } from "../command/renderer";

/** Stable semantic commands exposed by selected-drawing contextual chrome. */
export type DrawingContextualCommandId =
  | "layout"
  | "fill"
  | "outline"
  | "edit-text"
  | "delete";

/** Supported icon artwork for implemented drawing contextual commands. */
export type DrawingContextualCommandIcon =
  | "wrap"
  | "fill"
  | "outline"
  | "edit-text"
  | "delete";

/** Product languages supported by mounted drawing command copy. */
export type DrawingContextualCommandLocale = "zh-CN" | "en";

/** Stable localized copy keys used by selected-drawing menus. */
export type DrawingContextualMessageKey =
  | "objectLayout"
  | "inlineSection"
  | "textWrappingSection"
  | "inline"
  | "square"
  | "tight"
  | "through"
  | "topAndBottom"
  | "behindText"
  | "inFrontOfText"
  | "moveWithText"
  | "fixedOnPage"
  | "shapeFill"
  | "shapeOutline"
  | "noFill"
  | "noOutline"
  | "moreColors"
  | "recentColors"
  | "width"
  | "dash"
  | "solid"
  | "dashLine"
  | "dot"
  | "dashDot";

/** Complete localized selected-drawing menu copy. */
export type DrawingContextualMessages = Readonly<
  Record<DrawingContextualMessageKey, string>
>;

/** Menu-owning contextual commands whose state may survive retained refresh. */
export type DrawingContextualMenuCommandId = "layout" | "fill" | "outline";

/** Appearance commands that can own one secondary custom-color surface. */
export type DrawingCustomColorCommandId = "fill" | "outline";

/** Transient paint state projected into one contextual command icon. */
export type DrawingCommandPaintIndicator = Readonly<
  | {
    /** Solid paint projects its exact canonical RGB token. */
    readonly kind: "solid";
    /** Canonical solid color shown by the indicator. */
    readonly color: string;
  }
  | {
    /** Disabled paint projects an explicit crossed no-paint indicator. */
    readonly kind: "none";
  }
>;

/** Lifecycle owned by one shared contextual-command tooltip surface. */
export interface DrawingCommandTooltipController {
  /** Hides scheduled or visible tooltip feedback. */
  dismiss(): void;
  /** Releases listeners, timers, accessibility links, and the tooltip node. */
  destroy(): void;
}

/** Mounted selected-drawing command card and menu restoration lifecycle. */
export interface DrawingCommandCardController {
  /** Mounted command-card element. */
  readonly element: HTMLElement;
  /**
   * Reopens one retained menu after the card enters the document.
   *
   * @param command - Stable menu command to restore.
   */
  openMenu(command: DrawingContextualMenuCommandId): void;
  /** @param options - Current facts for the same drawing identity and renderer. */
  update(options: CreateDrawingCommandCardOptions): void;
  /** Removes the card and all transient menu/tooltip resources. */
  destroy(): void;
}

/** Facts and callbacks used to build one selected-object command card. */
export interface CreateDrawingCommandCardOptions {
  /** Product appearance controls, when registered for this editor. */
  readonly toolbarRenderer?: QuireDrawingToolbarRenderer | undefined;
  /** Whether current commands are unavailable. */
  readonly disabled: boolean;
  /** Document-space geometry of the accepted selected occurrence. */
  readonly rect: QuireRect;
  /** Whether the exact source anchor owns an editable text story. */
  readonly hasTextStory: boolean;
  /** Current canonical object layout state. */
  readonly attrs: DrawingAnchor;
  /** Mounted product language used by accessible command copy. */
  readonly locale: DrawingContextualCommandLocale;
  /** Changes the exact selected anchor attrs through a Word command. */
  readonly onAttrsChange: (patch: DrawingAnchorPatch) => boolean;
  /** Enters the exact selected text story. */
  readonly onEnterText: () => boolean;
  /** Deletes the exact selected drawing. */
  readonly onDelete: () => boolean;
  /** Retains user-authored menu state across selected-object refresh. */
  readonly onOpenMenuChange: (
    command: DrawingContextualMenuCommandId | null
  ) => void;
  /** Secondary custom-color surface retained across selected-object refresh. */
  readonly openCustomColorCommand: DrawingCustomColorCommandId | null;
  /** Retains user-authored secondary custom-color state across refresh. */
  readonly onCustomColorOpenChange: (
    command: DrawingCustomColorCommandId | null
  ) => void;
}
