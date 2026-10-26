import { createTextTokens } from "./text";
import { chooseReadableForeground, createFeedback } from "./feedback";
import {
  formatQuireRgbAlpha,
  generateQuireKitAlphaScale,
  generateQuireKitColorScale,
  parseQuireHexColor,
  defaultBaseTokens,
  resolveQuireKitNeutralScale
} from "../tokens";
import type {
  CreateThemeOptions,
  QuireKitSemanticColorTokens,
  QuireKitSemanticTypographyRole,
  QuireKitTheme,
  QuireKitThemeColorScales,
  QuireKitThemeColorSources,
  QuireKitThemeProfile
} from "./types";
import type { QuireKitBaseColorSources, QuireKitBaseOpacityTokens } from "../tokens";

/**
 * Compiles semantic color tokens from base tokens and a theme profile.
 *
 * @param options - Theme profile, scheme, base-token, and source-role overrides.
 * @returns Immutable semantic theme ready for CSS or component-token projection.
 */
export function createTheme(
  options: CreateThemeOptions = {}
): QuireKitTheme {
  const profile = options.profile ?? "precision";
  const scheme = options.scheme ?? "light";
  const tokens = options.tokens ?? defaultBaseTokens;
  const sources = Object.freeze({
    ...resolveThemeSources(profile, tokens.color.source),
    ...options.sources
  });
  const neutral = resolveQuireKitNeutralScale(scheme, tokens.color, profile);
  const generationOptions = Object.freeze({ background: neutral[1] });
  const scales: QuireKitThemeColorScales = Object.freeze({
    neutral,
    primary: generateQuireKitColorScale(sources.primary, scheme, tokens.color, generationOptions),
    info: generateQuireKitColorScale(sources.info, scheme, tokens.color, generationOptions),
    success: generateQuireKitColorScale(sources.success, scheme, tokens.color, generationOptions),
    warning: generateQuireKitColorScale(sources.warning, scheme, tokens.color, generationOptions),
    danger: generateQuireKitColorScale(sources.danger, scheme, tokens.color, generationOptions)
  });
  const alphaScales: QuireKitThemeColorScales = Object.freeze({
    neutral: generateQuireKitAlphaScale(scales.neutral, scales.neutral[1]),
    primary: generateQuireKitAlphaScale(scales.primary, scales.neutral[1]),
    info: generateQuireKitAlphaScale(scales.info, scales.neutral[1]),
    success: generateQuireKitAlphaScale(scales.success, scales.neutral[1]),
    warning: generateQuireKitAlphaScale(scales.warning, scales.neutral[1]),
    danger: generateQuireKitAlphaScale(scales.danger, scales.neutral[1])
  });
  const typography = tokens.typography;
  const elevation = scheme === "light" ? tokens.elevation.light : tokens.elevation.dark;
  return Object.freeze({
    profile,
    scheme,
    sources,
    scales,
    alphaScales,
    color: createSemanticColors(
      scales,
      scheme,
      tokens.opacity,
      sources.primary === tokens.color.source.ink,
      tokens.color.white
    ),
    typography: Object.freeze({
      display: typographyRole(typography.family.product, typography.size[40], typography.lineHeight[40], typography.weight.semibold, typography.letterSpacing.tight),
      pageTitle: typographyRole(typography.family.product, typography.size[28], typography.lineHeight[28], typography.weight.semibold, typography.letterSpacing.tight),
      sectionTitle: typographyRole(typography.family.product, typography.size[20], typography.lineHeight[20], typography.weight.semibold, typography.letterSpacing.tight),
      heading: typographyRole(typography.family.product, typography.size[16], typography.lineHeight[16], typography.weight.semibold, typography.letterSpacing.normal),
      body: typographyRole(typography.family.product, typography.size[14], typography.lineHeight[14], typography.weight.regular, typography.letterSpacing.normal),
      control: typographyRole(typography.family.product, typography.size[14], typography.lineHeight[14], typography.weight.medium, typography.letterSpacing.normal),
      compact: typographyRole(typography.family.product, typography.size[13], typography.lineHeight[13], typography.weight.regular, typography.letterSpacing.normal),
      helper: typographyRole(typography.family.product, typography.size[12], typography.lineHeight[12], typography.weight.regular, typography.letterSpacing.normal),
      code: typographyRole(typography.family.mono, typography.size[12], typography.lineHeight[12], typography.weight.regular, typography.letterSpacing.normal)
    }),
    spacing: Object.freeze({ inlineTight: tokens.spacing[4], inline: tokens.spacing[6], surfaceCompact: tokens.spacing[12], surface: tokens.spacing[16], group: tokens.spacing[24], section: tokens.spacing[32], page: tokens.spacing[40], major: tokens.spacing[48] }),
    radius: Object.freeze({ page: tokens.radius[2], control: tokens.radius[4], group: tokens.radius[6], overlay: tokens.radius[8], dialog: tokens.radius[12], pill: tokens.radius[999] }),
    borderWidth: Object.freeze({ none: tokens.borderWidth[0], default: tokens.borderWidth[1], focus: tokens.borderWidth[2] }),
    elevation: Object.freeze({ flat: elevation[0], raised: elevation[1], overlay: elevation[2], modal: elevation[3] }),
    motion: Object.freeze({ feedbackDuration: tokens.motion.duration[120], controlDuration: tokens.motion.duration[180], overlayDuration: tokens.motion.duration[240], standardEasing: tokens.motion.easing.standard, enterEasing: tokens.motion.easing.decelerate, exitEasing: tokens.motion.easing.accelerate }),
    opacity: Object.freeze({ transparent: tokens.opacity[0], disabled: tokens.opacity[42], muted: tokens.opacity[68], drag: tokens.opacity[78], pressed: tokens.opacity[88], hover: tokens.opacity[94], opaque: tokens.opacity[100] }),
    layer: Object.freeze({ base: tokens.layer[0], chrome: tokens.layer[100], overlay: tokens.layer[1000], modal: tokens.layer[1100], toast: tokens.layer[1200], tooltip: tokens.layer[1300] }),
    control: Object.freeze({ compact: tokens.size[24], default: tokens.size[28], regular: tokens.size[32], comfortable: tokens.size[36], large: tokens.size[40], icon: tokens.size[16], iconLarge: tokens.size[20], touchTarget: tokens.size[44] })
  });
}

/**
 * Creates one immutable semantic typography role.
 *
 * @param fontFamily - Approved font-family stack.
 * @param fontSize - Approved base font size.
 * @param lineHeight - Approved base line height.
 * @param fontWeight - Approved base font weight.
 * @param letterSpacing - Approved base letter spacing.
 * @returns Immutable semantic typography role.
 */
function typographyRole(fontFamily: string, fontSize: string, lineHeight: string, fontWeight: number, letterSpacing: string): QuireKitSemanticTypographyRole {
  return Object.freeze({ fontFamily, fontSize, lineHeight, fontWeight, letterSpacing });
}

/**
 * Resolves source roles selected by a theme profile from base colors.
 *
 * @param profile - Theme profile identity.
 * @param source - Base named chromatic sources.
 * @returns Immutable source-role mapping.
 */
function resolveThemeSources(
  profile: QuireKitThemeProfile,
  source: QuireKitBaseColorSources
): QuireKitThemeColorSources {
  return Object.freeze({
    primary: profile === "ink" ? source.ink : source.cobalt,
    info: source.blue,
    success: source.green,
    warning: source.amber,
    danger: source.red
  });
}

/**
 * Maps atomic palettes into stable editor-facing color roles.
 *
 * @param scales - Generated neutral and chromatic palettes.
 * @param scheme - Owning color scheme.
 * @param opacity - Approved base opacity scale used by semantic color roles.
 * @param useNeutralAction - Whether the primary action follows the neutral palette.
 * @param white - Base white for light page, raised and overlay surfaces.
 * @returns Immutable semantic color tokens.
 */
function createSemanticColors(
  scales: QuireKitThemeColorScales,
  scheme: QuireKitTheme["scheme"],
  opacity: QuireKitBaseOpacityTokens,
  useNeutralAction: boolean,
  white: string | undefined
): QuireKitSemanticColorTokens {
  const neutral = scales.neutral;
  const primary = scales.primary;
  // Light surfaces match the white document paper; a tinted step-one surface reads as muddy beside it.
  const lightSurface = white ?? neutral[1];
  const surfacePage = scheme === "light" ? lightSurface : neutral[2];
  const surfaceOverlay = scheme === "light" ? lightSurface : neutral[3];
  const actionPrimary = useNeutralAction ? neutral[11] : primary[6];
  const actionText = useNeutralAction ? actionPrimary : createFeedback(primary, scheme).text;
  const actionHover = useNeutralAction ? neutral[10] : (scheme === "light" ? primary[7] : primary[5]);
  const actionPressed = useNeutralAction
    ? (scheme === "light" ? neutral[11] : neutral[9])
    : (scheme === "light" ? primary[8] : primary[4]);
  const onAccent = chooseReadableForeground(actionPrimary);
  const surface = Object.freeze({
    transparent: formatQuireRgbAlpha(
      parseQuireHexColor(neutral[1]),
      opacity[0]
    ),
    workspace: scheme === "light" ? neutral[3] : neutral[1],
    page: surfacePage,
    chrome: scheme === "light" ? neutral[2] : neutral[3],
    subtle: scheme === "light" ? neutral[2] : neutral[3],
    raised: scheme === "light" ? lightSurface : neutral[3],
    overlay: surfaceOverlay,
    inverse: neutral[11],
    hover: scheme === "light" ? neutral[3] : neutral[4],
    pressed: neutral[5],
    selected: neutral[4],
    disabled: neutral[2],
    scrim: formatQuireRgbAlpha(
      parseQuireHexColor(scheme === "light" ? neutral[11] : neutral[1]),
      scheme === "light" ? opacity[42] : opacity[68]
    )
  });
  return Object.freeze({
    surface,
    text: createTextTokens(
      neutral,
      useNeutralAction ? actionPrimary : scheme === "light" ? primary[6] : primary[9],
      onAccent
    ),
    icon: Object.freeze({
      primary: neutral[11],
      secondary: neutral[9],
      disabled: neutral[7],
      onAccent
    }),
    border: Object.freeze({
      subtle: neutral[5],
      default: neutral[6],
      strong: neutral[7],
      focus: actionText,
      disabled: neutral[5]
    }),
    action: Object.freeze({
      primary: actionPrimary,
      text: actionText,
      hover: actionHover,
      pressed: actionPressed,
      soft: useNeutralAction ? neutral[3] : primary[1],
      softHover: useNeutralAction ? neutral[4] : primary[2],
      softPressed: useNeutralAction ? neutral[5] : primary[3],
      foreground: onAccent
    }),
    info: createFeedback(scales.info, scheme),
    success: createFeedback(scales.success, scheme),
    warning: createFeedback(scales.warning, scheme),
    danger: createFeedback(scales.danger, scheme),
    selection: Object.freeze({
      document: formatQuireRgbAlpha(parseQuireHexColor(primary[6]), opacity[30]),
      remote: formatQuireRgbAlpha(parseQuireHexColor(scales.info[6]), opacity[30]),
      dropTarget: formatQuireRgbAlpha(parseQuireHexColor(scales.success[6]), opacity[30])
    })
  });
}
