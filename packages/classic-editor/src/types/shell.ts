import type { ClassicEditorText } from "./base";
import type {
  ClassicEditorRibbonGroupPresentation
} from "./contributions/controls";

/** One freely composed group in the tabbed Classic Editor command bar. */
export interface ClassicEditorCommandBarGroupOptions {
  /** Stable configuration id used as a Vue render key. */
  readonly id: string;
  /** Ribbon tab that displays the group. Defaults to `home`. */
  readonly tabId?: string | undefined;
  /** Ribbon-control or ribbon-widget contribution ids in desired display order. */
  readonly controls: readonly string[];
  /** Optional visible label overriding the matching group declaration. */
  readonly label?: ClassicEditorText | undefined;
  /** Optional group layout treatment overriding the matching group declaration. */
  readonly presentation?: ClassicEditorRibbonGroupPresentation | undefined;
  /** Optional compound-menu trigger icon overriding the group declaration. */
  readonly icon?: string | undefined;
}

/** Consumer composition for the main tabbed command bar. */
export interface ClassicEditorCommandBarOptions {
  /** Ordered groups. Omit to use contribution-owned default grouping. */
  readonly groups?: readonly ClassicEditorCommandBarGroupOptions[] | undefined;
  /** Explicit opt-in for the direct-action-only cutover preview. */
  readonly preview?: boolean | undefined;
}

/** Visibility and initial state for product shell regions. */
export interface ClassicEditorShellOptions {
  /** Whether the menu bar is rendered. */
  readonly menuBar?: boolean | undefined;
  /** Whether the ribbon region is rendered. */
  readonly ribbon?: boolean | undefined;
  /** Whether the compact toolbar region is rendered. */
  readonly toolbar?: boolean | undefined;
  /** How the ribbon toolbar handles a narrow window: scroll horizontally (default) or collapse trailing controls into "more". */
  readonly ribbonOverflow?: "scroll" | "collapse" | undefined;
  /** Whether the horizontal ruler slot is rendered. */
  readonly ruler?: boolean | undefined;
  /** Whether the left sidebar starts visible. */
  readonly leftSidebar?: boolean | undefined;
  /** Whether the right sidebar starts visible. */
  readonly rightSidebar?: boolean | undefined;
  /** Whether the status bar is rendered. */
  readonly statusBar?: boolean | undefined;
  /** Optional ribbon tab selected on first mount. */
  readonly activeRibbonTab?: string | undefined;
  /** Optional command-bar composition by stable ribbon item contribution id. */
  readonly commandBar?: ClassicEditorCommandBarOptions | undefined;
}
