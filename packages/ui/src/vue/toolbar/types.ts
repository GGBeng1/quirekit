import type { HTMLAttributes } from "vue";
import type { QuireKitToolbarEntry, QuireKitToolbarRow, QuireKitToolbarVariant, QuireKitToolbarDirection, QuireKitToolbarOrientation, QuireKitToolbarOverflow, QuireKitToolbarScrollbar, QuireKitToolbarAlignment, QuireKitToolbarSizing, QuireKitToolbarMode } from "../../components/toolbar/types";
import type { QuireKitToolbarRendererScope, QuireKitToolbarRenderers } from "./items/types";

/** Public properties for the Vue Toolbar root. */
export interface QuireKitToolbarProps {
  /** Data entries; the default slot takes precedence. */
  readonly items?: readonly QuireKitToolbarEntry[];
  /** Explicit horizontal rows sharing one surface and focus scope; overrides items/orientation, below the default slot. */
  readonly rows?: readonly QuireKitToolbarRow[];
  /** Registered custom controls and popup bodies, each receiving a scope prop. */
  readonly renderers?: QuireKitToolbarRenderers;
  /** Host-owned state or services forwarded to custom renderers unchanged. */
  readonly context?: unknown;
  /** Preserve host focus on primary mouse presses on toolbar buttons only. */
  readonly preserveFocus?: boolean;
  /** Embedded, outlined, or borderless elevated surface. */
  readonly variant?: QuireKitToolbarVariant;
  /** Accessible name announced for the complete toolbar. */
  readonly label: string;
  /** Desktop (default), touch controls, or owner-document layout media. */
  readonly mode?: QuireKitToolbarMode;
  /** Owning portal target for the collapsed operation surface. */
  readonly overflowPortalTarget?: string | HTMLElement;
  /** Return focus after overflow closes; false when handing control to another task. */
  readonly overflowRestoreFocus?: boolean;
  /** Layout and keyboard-navigation direction. */
  readonly orientation?: QuireKitToolbarOrientation;
  /** Horizontal overflow; vertical toolbars retain their natural layout. */
  readonly overflow?: QuireKitToolbarOverflow;
  /** Native horizontal scrollbar presentation. */
  readonly scrollbar?: QuireKitToolbarScrollbar;
  /** Inline alignment when the row fits; overflow retains a reachable start. */
  readonly align?: QuireKitToolbarAlignment;
  /** Explicit text direction; inherited CSS direction is used when omitted. */
  readonly dir?: QuireKitToolbarDirection;
  /** Whether arrow-key movement wraps across toolbar edges. */
  readonly loopFocus?: boolean;
  /** Optional stable DOM id. */
  readonly id?: HTMLAttributes["id"];
  /** Width model: natural control widths, or widths in toolbar units (one icon action per unit). */
  readonly sizing?: QuireKitToolbarSizing;
  /** Row capacity in toolbar units; configured rows wrap when their controls exceed it. */
  readonly unitsPerRow?: number;
}

/** Public slots for the Vue Toolbar root. */
export interface QuireKitToolbarSlots {
  /** Toolbar groups, actions, toggles, disclosures, and separators. */
  readonly default?: () => unknown;
  /** Custom entries preserve public toolbar primitive composition. */
  readonly item?: (props: QuireKitToolbarRendererScope) => unknown;
  /** Fallback body for configured selector, disclosure and split popovers. */
  readonly content?: (props: QuireKitToolbarRendererScope) => unknown;
}
