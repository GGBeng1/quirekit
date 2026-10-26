import type { HTMLAttributes } from "vue";

/** Shared code title and actions when a consumer owns the editable body. */
export interface QuireKitCodeBlockHeaderProps {
  /** Source for exact copying. Defaults to empty. */ readonly code?: string;
  /** Action-only source getter for editor-owned text. */ readonly getCode?: () => string;
  /** Language label. */ readonly language?: string | undefined;
  /** Optional file title. */ readonly filename?: string | undefined;
  /** Show the shared copy control. Defaults to true. */ readonly copy?: boolean;
}

/** Code presentation and copy behavior, independent of a parser or highlighter. */
export interface QuireKitCodeBlockProps {
  /** Original source, copied byte-for-byte without trimming or markup. */
  readonly code: string;
  /** Informational syntax language; does not load a highlighter. */
  readonly language?: string;
  /** Optional filename displayed in the header. */
  readonly filename?: string;
  /** Surface treatment. Defaults to soft; outline uses a page surface and plain removes the frame. */
  readonly variant?: "soft" | "outline" | "plain";
  /** Reading spacing. Compact is suitable for short commands. Defaults to regular. */
  readonly density?: "regular" | "compact";
  /** Show the title row. Defaults to true; collapse, title and actions slots retain their controls. */
  readonly header?: boolean;
  /** Inherit the host scheme or isolate the default light/dark color theme. Defaults to auto. */
  readonly scheme?: "auto" | "light" | "dark";
  /** Display line numbers in the built-in line renderer. Defaults to false. */
  readonly lineNumbers?: boolean;
  /** First displayed line number, a positive integer. Defaults to 1. */
  readonly startLine?: number;
  /** Displayed line numbers to emphasize; applies to the built-in renderer and line slot. */
  readonly highlightedLines?: readonly number[];
  /** Displayed line numbers marked as additions. Source remains unmodified. */
  readonly addedLines?: readonly number[];
  /** Displayed line numbers marked as removals; takes precedence over additions. */
  readonly removedLines?: readonly number[];
  /** Show the public Clipboard trigger. Defaults to true. */
  readonly copy?: boolean;
  /** Limit visible source height in px; defaults to 400. */
  readonly maxHeight?: number;
  /** Wrap long lines instead of scrolling horizontally. Defaults to false. */
  readonly wrap?: boolean;
  /** Allow the source viewport to be collapsed. Defaults to false. */
  readonly collapsible?: boolean;
  /** Controlled collapse state; ignored unless collapsible is true. */
  readonly collapsed?: boolean | undefined;
  /** Initial uncontrolled collapse state. Defaults to true when collapsible is enabled. */
  readonly defaultCollapsed?: boolean;
  /** Scroll viewport name; falls back to the filename or the language pack's generic code name. */
  readonly ariaLabel?: string;
}
/** A trusted highlighter renderer supplies a complete code element through the slot. */
export interface QuireKitCodeBlockSlotProps {
  /** Original unmodified source. */
  readonly code: string;
  /** Informational language, when present. */
  readonly language: string | undefined;
}
/** Context for line-level highlighting, without taking ownership of the gutter. */
export interface QuireKitCodeBlockLineSlotProps {
  /** Line source excluding its newline separator. */
  readonly text: string;
  /** Displayed one-based line number, including startLine. */
  readonly number: number;
}
/** Context for an external navigation control such as Tabs. */
export interface QuireKitCodeBlockNavigationSlotProps {
  /** Stable id of the shared content panel. */
  readonly contentId: string;
}
/** Theme ownership for custom actions that render portalled content. */
export interface QuireKitCodeBlockActionsSlotProps {
  /** Pass to a popup's contentProps to retain this block's explicit color scheme. */
  readonly contentProps: HTMLAttributes & {
    /** Explicit scheme consumed by portalled highlighter or control content. */
    readonly "data-qk-scheme"?: "light" | "dark";
  };
}
