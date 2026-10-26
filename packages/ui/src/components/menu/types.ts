import type { QuireKitSemanticTypographyRole } from "../../theme";

/** Visual emphasis supported by actionable menu rows. */
export type QuireKitMenuItemTone = "neutral" | "danger";

/** CSS inline-size value accepted by Menu width constraints. */
export type QuireKitMenuLength = string | number;

/** Initial focus for embedded controls or the menu navigation surface itself. */
export type QuireKitMenuInitialFocus = "auto" | "menu";

/** Typography tokens used by ordinary menu labels. */
export interface QuireKitMenuTypographyTokens {
  /** Product font family inherited by the complete menu surface. */
  readonly fontFamily: QuireKitSemanticTypographyRole["fontFamily"];
  /** Compact menu-label font size. */
  readonly fontSize: QuireKitSemanticTypographyRole["fontSize"];
  /** Compact menu-label line height. */
  readonly lineHeight: QuireKitSemanticTypographyRole["lineHeight"];
  /** Menu-label font weight. */
  readonly fontWeight: QuireKitSemanticTypographyRole["fontWeight"];
  /** Menu-label letter spacing. */
  readonly letterSpacing: QuireKitSemanticTypographyRole["letterSpacing"];
}

/** Typography tokens used by shortcuts and supporting metadata. */
export interface QuireKitMenuMetadataTypographyTokens {
  /** Monospace family used by keyboard shortcuts. */
  readonly fontFamily: QuireKitSemanticTypographyRole["fontFamily"];
  /** Supporting metadata font size. */
  readonly fontSize: QuireKitSemanticTypographyRole["fontSize"];
  /** Supporting metadata line height. */
  readonly lineHeight: QuireKitSemanticTypographyRole["lineHeight"];
}

/** Color tokens owned by the menu overlay and its rows. */
export interface QuireKitMenuColorTokens {
  /** Background of the floating menu surface. */
  readonly surface: string;
  /** Structural boundary around the floating surface. */
  readonly border: string;
  /** Quiet separator between menu groups. */
  readonly separator: string;
  /** Default label and icon color. */
  readonly foreground: string;
  /** Label and icon color on the highlighted row. */
  readonly highlightedForeground: string;
  /** Highlighted row background shared by pointer and keyboard focus. */
  readonly highlightedBackground: string;
  /** Checked option-row background. */
  readonly checkedBackground: string;
  /** Supporting shortcut and trailing metadata color. */
  readonly metadataForeground: string;
  /** Disabled row content color. */
  readonly disabledForeground: string;
  /** Destructive row content color. */
  readonly dangerForeground: string;
  /** Destructive row background under highlight. */
  readonly dangerHighlightedBackground: string;
}

/** Geometry tokens owned by the menu overlay and its rows. */
export interface QuireKitMenuGeometryTokens {
  /** Stable width used when a Menu does not declare another size constraint. */
  readonly contentWidth: string;
  /** Interior padding around the complete menu list. */
  readonly contentPadding: string;
  /** Stable height of each ordinary menu row. */
  readonly itemHeight: string;
  /** Horizontal padding inside each menu row. */
  readonly itemPaddingInline: string;
  /** Gap between indicator, label, shortcut, and disclosure columns. */
  readonly itemGap: string;
  /** Size of leading indicators and trailing disclosure icons. */
  readonly iconSize: string;
  /** Corner radius of the floating overlay. */
  readonly overlayRadius: string;
  /** Corner radius of an individual highlighted row. */
  readonly itemRadius: string;
  /** Width of the overlay boundary. */
  readonly borderWidth: string;
  /** Height of a group separator. */
  readonly separatorWidth: string;
  /** Horizontal inset applied to group separators. */
  readonly separatorInset: string;
  /** Space before an optional group label. */
  readonly groupLabelPaddingBlock: string;
  /** Horizontal padding around an optional group label. */
  readonly groupLabelPaddingInline: string;
}

/** Complete Menu component-token contract derived from semantic theme roles. */
export interface QuireKitMenuTokens {
  /** Menu-label typography. */
  readonly typography: QuireKitMenuTypographyTokens;
  /** Shortcut and metadata typography. */
  readonly metadataTypography: QuireKitMenuMetadataTypographyTokens;
  /** Menu color roles. */
  readonly color: QuireKitMenuColorTokens;
  /** Menu geometry roles. */
  readonly geometry: QuireKitMenuGeometryTokens;
  /** Overlay elevation. */
  readonly shadow: string;
  /** Menu and submenu stacking level. */
  readonly layer: number;
  /** Short state-feedback transition duration. */
  readonly feedbackDuration: string;
  /** Overlay entrance and exit duration. */
  readonly overlayDuration: string;
  /** Standard state-feedback easing. */
  readonly feedbackEasing: string;
  /** Decelerating overlay entrance easing. */
  readonly enterEasing: string;
  /** Accelerating overlay exit easing. */
  readonly exitEasing: string;
}

/** Declarative menu row; rendering reuses the same public Menu primitives as slots. */
export interface QuireKitMenuEntry {
  /** Stable identity emitted for executable rows. */
  readonly value: string;
  /** Localized visible label. */
  readonly label: string;
  /** Group, submenu or ordinary action. */
  readonly kind?: "item" | "group" | "submenu" | "separator" | "radio-group" | undefined;
  /** Ordered rows belonging to a group or submenu. */
  readonly children?: readonly QuireKitMenuEntry[] | undefined;
  /** Whether activation is unavailable. */
  readonly disabled?: boolean | undefined;
  /** Optional explanation of an unavailable action. */
  readonly reason?: string | undefined;
  /** Shortcut rendered with Kbd; pass explicit keys for combined shortcuts, or a legacy display string. */
  readonly shortcut?: string | readonly string[] | undefined;
  /** Icon name resolved by the current QuireIconProvider. */
  readonly icon?: string | undefined;
  /** Current value of a radio group; its children describe the options. */
  readonly selectedValue?: string | undefined;
  /** Whether activating a leaf closes the menu; checkboxes and radio items default to false. */
  readonly closeOnSelect?: boolean | undefined;
  /** Checked state for a toggle row; omission is an ordinary action. */
  readonly checked?: boolean | undefined;
  /** Visual action emphasis. */
  readonly tone?: QuireKitMenuItemTone | undefined;
}

/** Viewport-space point supplied by a semantic or keyboard menu trigger. */
export interface QuireKitMenuAnchorPoint {
  /** Horizontal coordinate in CSS viewport pixels. */
  readonly x: number;
  /** Vertical coordinate in CSS viewport pixels. */
  readonly y: number;
}
