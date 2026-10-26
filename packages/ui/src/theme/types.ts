import type {
  QuireKitColorScheme,
  QuireKitNeutralPalette,
  QuireKitGeneratedColorScale,
  QuireKitBaseTokens
} from "../tokens";

/** Built-in theme profiles that provide values for one semantic-token contract. */
export type QuireKitThemeProfile = QuireKitNeutralPalette;

/** Chromatic source roles selected by one theme profile. */
export interface QuireKitThemeColorSources {
  /** Product focus and primary-action source. */
  readonly primary: string;
  /** Informational and processing source. */
  readonly info: string;
  /** Successful-outcome source. */
  readonly success: string;
  /** Recoverable-risk source. */
  readonly warning: string;
  /** Error and destructive-action source. */
  readonly danger: string;
}

/** Generated atomic palettes available to semantic theme mapping. */
export interface QuireKitThemeColorScales {
  /** Manually reviewed neutral palette. */
  readonly neutral: QuireKitGeneratedColorScale;
  /** Generated product primary palette. */
  readonly primary: QuireKitGeneratedColorScale;
  /** Generated informational palette. */
  readonly info: QuireKitGeneratedColorScale;
  /** Generated success palette. */
  readonly success: QuireKitGeneratedColorScale;
  /** Generated warning palette. */
  readonly warning: QuireKitGeneratedColorScale;
  /** Generated danger palette. */
  readonly danger: QuireKitGeneratedColorScale;
}

/** Surface roles used by product chrome and editor workspaces. */
export interface QuireKitSemanticSurfaceTokens {
  /** Fully transparent surface derived from the zero-opacity base token. */
  readonly transparent: string;
  /** Editor workspace outside document pages. */
  readonly workspace: string;
  /** Document page or paper surface. */
  readonly page: string;
  /** Persistent toolbar, rail, and product chrome. */
  readonly chrome: string;
  /** Quiet grouping and control-track surface. */
  readonly subtle: string;
  /** Locally raised non-modal surface. */
  readonly raised: string;
  /** Menu, popover, and quick-bar surface. */
  readonly overlay: string;
  /** Neutral solid and inverted chrome background, paired with text.inverse. */
  readonly inverse: string;
  /** Neutral pointer-hover surface. */
  readonly hover: string;
  /** Neutral pressed surface. */
  readonly pressed: string;
  /** Persistent neutral selected surface. */
  readonly selected: string;
  /** Unavailable-control surface. */
  readonly disabled: string;
  /** Modal and task-workspace scrim. */
  readonly scrim: string;
}

/** Text roles projected from semantic theme colors. */
export interface QuireKitSemanticTextTokens {
  /** Highest-contrast headings, body copy, entered values, and primary labels. */
  readonly primary: string;
  /** Supporting product text. */
  readonly secondary: string;
  /** Metadata readable across neutral interaction surfaces. */
  readonly tertiary: string;
  /** Quiet readable hints on static neutral surfaces. */
  readonly muted: string;
  /** Empty-input prompts readable on field and hover surfaces. */
  readonly placeholder: string;
  /** Accent on neutral surfaces: source six in light mode, step nine in dark mode; neutral themes retain their action identity. */
  readonly accent: string;
  /** Unavailable text. */
  readonly disabled: string;
  /** Text shown on inverted chrome. */
  readonly inverse: string;
  /** Text shown on the primary solid action. */
  readonly onAccent: string;
}

/** Icon roles projected separately from text roles. */
export interface QuireKitSemanticIconTokens {
  /** Primary icon color. */
  readonly primary: string;
  /** Supporting icon color. */
  readonly secondary: string;
  /** Unavailable icon color. */
  readonly disabled: string;
  /** Icon shown on the primary solid action. */
  readonly onAccent: string;
}

/** Boundary roles used by controls and surfaces. */
export interface QuireKitSemanticBorderTokens {
  /** Quiet structural separator. */
  readonly subtle: string;
  /** Default control or surface boundary. */
  readonly default: string;
  /** Strong input or resizable-structure boundary. */
  readonly strong: string;
  /** Keyboard-focus boundary. */
  readonly focus: string;
  /** Unavailable-control boundary. */
  readonly disabled: string;
}

/** Primary action roles projected from the accent palette. */
export interface QuireKitSemanticActionTokens {
  /** Primary solid action. */
  readonly primary: string;
  /** Existing palette token from steps six through eight in light mode and step nine in dark mode; neutral actions use their solid token. */
  readonly text: string;
  /** Primary solid action hover. */
  readonly hover: string;
  /** Primary solid action pressed state. */
  readonly pressed: string;
  /** Quiet accent-tinted explanatory surface. */
  readonly soft: string;
  /** Accent-tinted surface under pointer hover. */
  readonly softHover: string;
  /** Accent-tinted surface while pressed. */
  readonly softPressed: string;
  /** Content shown on the primary solid action. */
  readonly foreground: string;
}

/** One semantic feedback family. */
export interface QuireKitSemanticFeedbackTokens {
  /** Quiet feedback surface. */
  readonly surface: string;
  /** Feedback surface under pointer hover. */
  readonly hoverSurface: string;
  /** Feedback surface while pressed. */
  readonly pressedSurface: string;
  /** Feedback boundary. */
  readonly border: string;
  /** Existing palette token from steps six through eight in light mode and step nine in dark mode for feedback text and icons. */
  readonly text: string;
  /** Feedback text and icon. */
  readonly foreground: string;
  /** Solid feedback action or marker. */
  readonly solid: string;
  /** Content shown on the solid feedback color. */
  readonly onSolid: string;
}

/** Document and direct-manipulation selection roles. */
export interface QuireKitSemanticSelectionTokens {
  /** Authored document text or object selection. */
  readonly document: string;
  /** Remote collaborator selection placeholder. */
  readonly remote: string;
  /** Valid drag-and-drop target. */
  readonly dropTarget: string;
}

/** Complete semantic color-token layer for one theme profile and scheme. */
export interface QuireKitSemanticColorTokens {
  /** Surface roles. */
  readonly surface: QuireKitSemanticSurfaceTokens;
  /** Text roles. */
  readonly text: QuireKitSemanticTextTokens;
  /** Icon roles. */
  readonly icon: QuireKitSemanticIconTokens;
  /** Boundary roles. */
  readonly border: QuireKitSemanticBorderTokens;
  /** Primary action roles. */
  readonly action: QuireKitSemanticActionTokens;
  /** Informational feedback roles. */
  readonly info: QuireKitSemanticFeedbackTokens;
  /** Successful-outcome feedback roles. */
  readonly success: QuireKitSemanticFeedbackTokens;
  /** Recoverable-risk feedback roles. */
  readonly warning: QuireKitSemanticFeedbackTokens;
  /** Error and destructive-action feedback roles. */
  readonly danger: QuireKitSemanticFeedbackTokens;
  /** Selection and direct-manipulation roles. */
  readonly selection: QuireKitSemanticSelectionTokens;
}

/** One semantic typography role compiled from explicit base typography values. */
export interface QuireKitSemanticTypographyRole {
  /** Font-family stack. */ readonly fontFamily: string;
  /** Font size. */ readonly fontSize: string;
  /** Line height. */ readonly lineHeight: string;
  /** Font weight. */ readonly fontWeight: number;
  /** Letter spacing. */ readonly letterSpacing: string;
}

/** Product typography roles; consumers choose a role instead of raw sizes. */
export interface QuireKitSemanticTypographyTokens {
  /** Large design-site or empty-state display title. */ readonly display: QuireKitSemanticTypographyRole;
  /** Product page title. */ readonly pageTitle: QuireKitSemanticTypographyRole;
  /** Major section title. */ readonly sectionTitle: QuireKitSemanticTypographyRole;
  /** Local card, panel, or dialog heading. */ readonly heading: QuireKitSemanticTypographyRole;
  /** Default reading and product body text. */ readonly body: QuireKitSemanticTypographyRole;
  /** Button, input, and menu label. */ readonly control: QuireKitSemanticTypographyRole;
  /** Dense value and compact metadata. */ readonly compact: QuireKitSemanticTypographyRole;
  /** Supporting explanation. */ readonly helper: QuireKitSemanticTypographyRole;
  /** Code and keyboard shortcut text. */ readonly code: QuireKitSemanticTypographyRole;
}

/** Semantic spacing roles derived from the numeric base ruler. */
export interface QuireKitSemanticSpacingTokens {
  /** Tight icon-to-label gap. */ readonly inlineTight: string;
  /** Regular inline gap. */ readonly inline: string;
  /** Internal compact-surface padding. */ readonly surfaceCompact: string;
  /** Internal regular-surface padding. */ readonly surface: string;
  /** Related-control group gap. */ readonly group: string;
  /** Section-to-section gap. */ readonly section: string;
  /** Page-edge gap. */ readonly page: string;
  /** Major composition gap. */ readonly major: string;
}

/** Semantic corner roles derived from the raw radius ruler. */
export interface QuireKitSemanticRadiusTokens {
  /** Document page corner. */ readonly page: string;
  /** Interactive-control corner. */ readonly control: string;
  /** Grouped-control track corner. */ readonly group: string;
  /** Menu and popover corner. */ readonly overlay: string;
  /** Dialog corner. */ readonly dialog: string;
  /** Pill and circular corner. */ readonly pill: string;
}

/** Semantic border widths. */
export interface QuireKitSemanticBorderWidthTokens {
  /** No visible boundary. */ readonly none: string;
  /** Default structural boundary. */ readonly default: string;
  /** Keyboard-focus boundary. */ readonly focus: string;
}

/** Semantic elevation roles. */
export interface QuireKitSemanticElevationTokens {
  /** Flat surface. */ readonly flat: string;
  /** Raised local surface. */ readonly raised: string;
  /** Menu or popover surface. */ readonly overlay: string;
  /** Modal task surface. */ readonly modal: string;
}

/** Semantic motion roles. */
export interface QuireKitSemanticMotionTokens {
  /** Hover or pressed feedback duration. */ readonly feedbackDuration: string;
  /** Standard control transition duration. */ readonly controlDuration: string;
  /** Overlay transition duration. */ readonly overlayDuration: string;
  /** Standard state easing. */ readonly standardEasing: string;
  /** Overlay entrance easing. */ readonly enterEasing: string;
  /** Overlay exit easing. */ readonly exitEasing: string;
}

/** Semantic opacity roles mapped from the numeric base opacity scale. */
export interface QuireKitSemanticOpacityTokens {
  /** Fully transparent content. */ readonly transparent: number;
  /** Disabled control content. */ readonly disabled: number;
  /** Muted supporting content. */ readonly muted: number;
  /** Drag preview content. */ readonly drag: number;
  /** Pressed control intensity without changing its color role. */ readonly pressed: number;
  /** Hovered control intensity without changing its color role. */ readonly hover: number;
  /** Fully opaque content. */ readonly opaque: number;
}

/** Semantic control-height roles and their shared interaction geometry. */
export interface QuireKitSemanticControlTokens {
  /** Pointer-oriented dense-toolbar control height. */ readonly compact: string;
  /** Default editor control height. */ readonly default: string;
  /** Regular form and popover control height. */ readonly regular: string;
  /** Comfortable dialog and inspector control height. */ readonly comfortable: string;
  /** Large visible control height for touch-oriented surfaces. */ readonly large: string;
  /** Default icon box. */ readonly icon: string;
  /** Large icon box. */ readonly iconLarge: string;
  /** Enhanced pointer target for touch input, independent of visible height. */ readonly touchTarget: string;
}

/** Semantic stack order shared by cross-component overlays. */
export interface QuireKitSemanticLayerTokens {
  /** Normal content. */ readonly base: number;
  /** Sticky chrome. */ readonly chrome: number;
  /** Menus and popovers. */ readonly overlay: number;
  /** Dialogs. */ readonly modal: number;
  /** Toast notifications. */ readonly toast: number;
  /** Tooltips. */ readonly tooltip: number;
}

/** Complete semantic theme compiled only from approved base tokens. */
export interface QuireKitTheme {
  /** Theme profile that supplies values for the semantic-token contract. */
  readonly profile: QuireKitThemeProfile;
  /** Owning light or dark projection. */
  readonly scheme: QuireKitColorScheme;
  /** Source roles selected by the theme profile. */
  readonly sources: QuireKitThemeColorSources;
  /** Generated atomic palettes used during semantic projection. */
  readonly scales: QuireKitThemeColorScales;
  /** Reverse-composited transparent palettes paired with the solid scales. */
  readonly alphaScales: QuireKitThemeColorScales;
  /** Semantic color roles consumed by future component tokens. */
  readonly color: QuireKitSemanticColorTokens;
  /** Semantic typography roles. */ readonly typography: QuireKitSemanticTypographyTokens;
  /** Semantic spacing roles. */ readonly spacing: QuireKitSemanticSpacingTokens;
  /** Semantic corner roles. */ readonly radius: QuireKitSemanticRadiusTokens;
  /** Semantic border widths. */ readonly borderWidth: QuireKitSemanticBorderWidthTokens;
  /** Semantic elevation roles. */ readonly elevation: QuireKitSemanticElevationTokens;
  /** Semantic motion roles. */ readonly motion: QuireKitSemanticMotionTokens;
  /** Semantic opacity states mapped from the numeric base scale. */ readonly opacity: QuireKitSemanticOpacityTokens;
  /** Semantic layer roles. */ readonly layer: QuireKitSemanticLayerTokens;
  /** Four public component-size roles. */ readonly control: QuireKitSemanticControlTokens;
}

/** Inputs accepted by the semantic-theme compiler. */
export interface CreateThemeOptions {
  /** Theme profile that supplies semantic-token values. */
  readonly profile?: QuireKitThemeProfile | undefined;
  /** Light or dark scheme to compile. */
  readonly scheme?: QuireKitColorScheme | undefined;
  /** Base-token authority used by validation fixtures or host themes. */
  readonly tokens?: QuireKitBaseTokens | undefined;
  /** Optional source-role overrides without handwritten state colors. */
  readonly sources?: Partial<QuireKitThemeColorSources> | undefined;
}
