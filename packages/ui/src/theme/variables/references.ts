import type { QuireKitTheme } from "../types";
import {
  themeCssVariableNames,
  type QuireKitThemeCssVariableName
} from "./names";

/** Semantic theme references consumed by UnoCSS and component-token compilers. */
type CssReferences<T> = T extends string | number
  ? string
  : { readonly [Key in keyof T]: CssReferences<T[Key]> };

/** CSS-reference projection of every semantic theme value consumed by styling adapters. */
export type QuireKitThemeVariableReferences = CssReferences<
  Pick<QuireKitTheme, "color" | "typography" | "spacing" | "radius" | "borderWidth" | "elevation" | "motion" | "opacity" | "layer" | "control">
>;

/** Complete semantic variable references consumed by UnoCSS and component tokens. */
export const themeVariableReferences: QuireKitThemeVariableReferences = Object.freeze({
  color: Object.freeze({
    surface: mapSurfaceReferences(),
    text: mapTextReferences(),
    icon: mapIconReferences(),
    border: mapBorderReferences(),
    action: mapActionReferences(),
    info: mapFeedbackReferences("info"),
    success: mapFeedbackReferences("success"),
    warning: mapFeedbackReferences("warning"),
    danger: mapFeedbackReferences("danger"),
    selection: Object.freeze({
      document: reference(themeCssVariableNames.color.selection.document),
      remote: reference(themeCssVariableNames.color.selection.remote),
      dropTarget: reference(themeCssVariableNames.color.selection.dropTarget)
    })
  }),
  typography: mapTypographyReferences(),
  spacing: mapFlatReferences(themeCssVariableNames.spacing),
  radius: mapFlatReferences(themeCssVariableNames.radius),
  borderWidth: mapFlatReferences(themeCssVariableNames.borderWidth),
  elevation: mapFlatReferences(themeCssVariableNames.elevation),
  motion: mapFlatReferences(themeCssVariableNames.motion),
  opacity: mapFlatReferences(themeCssVariableNames.opacity),
  layer: mapFlatReferences(themeCssVariableNames.layer),
  control: mapFlatReferences(themeCssVariableNames.control)
});

/**
 * Creates one CSS variable reference from an already-declared name.
 *
 * @param name - Declared semantic CSS custom-property name.
 * @returns CSS var reference.
 */
function reference(name: QuireKitThemeCssVariableName): string {
  return `var(${name})`;
}

/**
 * Projects declared surface variable names into CSS references.
 *
 * @returns Immutable surface references from the explicit contract.
 */
function mapSurfaceReferences(): QuireKitThemeVariableReferences["color"]["surface"] {
  const name = themeCssVariableNames.color.surface;
  return Object.freeze({
    transparent: reference(name.transparent),
    workspace: reference(name.workspace), page: reference(name.page), chrome: reference(name.chrome),
    subtle: reference(name.subtle), raised: reference(name.raised), overlay: reference(name.overlay),
    inverse: reference(name.inverse),
    hover: reference(name.hover), pressed: reference(name.pressed), selected: reference(name.selected),
    disabled: reference(name.disabled), scrim: reference(name.scrim)
  });
}

/**
 * Projects declared text variable names into CSS references.
 *
 * @returns Immutable text references from the explicit contract.
 */
function mapTextReferences(): QuireKitThemeVariableReferences["color"]["text"] {
  const name = themeCssVariableNames.color.text;
  return Object.freeze({
    primary: reference(name.primary), secondary: reference(name.secondary), tertiary: reference(name.tertiary),
    muted: reference(name.muted), placeholder: reference(name.placeholder),
    accent: reference(name.accent), disabled: reference(name.disabled), inverse: reference(name.inverse), onAccent: reference(name.onAccent)
  });
}

/**
 * Projects declared icon variable names into CSS references.
 *
 * @returns Immutable icon references from the explicit contract.
 */
function mapIconReferences(): QuireKitThemeVariableReferences["color"]["icon"] {
  const name = themeCssVariableNames.color.icon;
  return Object.freeze({
    primary: reference(name.primary), secondary: reference(name.secondary), disabled: reference(name.disabled),
    onAccent: reference(name.onAccent)
  });
}

/**
 * Projects declared boundary variable names into CSS references.
 *
 * @returns Immutable boundary references from the explicit contract.
 */
function mapBorderReferences(): QuireKitThemeVariableReferences["color"]["border"] {
  const name = themeCssVariableNames.color.border;
  return Object.freeze({
    subtle: reference(name.subtle), default: reference(name.default), strong: reference(name.strong),
    focus: reference(name.focus), disabled: reference(name.disabled)
  });
}

/**
 * Projects declared action variable names into CSS references.
 *
 * @returns Immutable action references from the explicit contract.
 */
function mapActionReferences(): QuireKitThemeVariableReferences["color"]["action"] {
  const name = themeCssVariableNames.color.action;
  return Object.freeze({
    primary: reference(name.primary), text: reference(name.text), hover: reference(name.hover), pressed: reference(name.pressed),
    soft: reference(name.soft), softHover: reference(name.softHover), softPressed: reference(name.softPressed),
    foreground: reference(name.foreground)
  });
}

/**
 * Creates references for one declared feedback family.
 *
 * @param family - Approved feedback family.
 * @returns Immutable semantic feedback references.
 */
function mapFeedbackReferences(
  family: "info" | "success" | "warning" | "danger"
): QuireKitThemeVariableReferences["color"]["info"] {
  const name = themeCssVariableNames.color[family];
  return Object.freeze({
    surface: reference(name.surface), hoverSurface: reference(name.hoverSurface), pressedSurface: reference(name.pressedSurface),
    border: reference(name.border), text: reference(name.text), foreground: reference(name.foreground),
    solid: reference(name.solid), onSolid: reference(name.onSolid)
  });
}

/** @returns Semantic typography references backed by explicit variable names. */
function mapTypographyReferences(): QuireKitThemeVariableReferences["typography"] {
  const names = themeCssVariableNames.typography;
  return Object.freeze({
    display: mapFlatReferences(names.display), pageTitle: mapFlatReferences(names.pageTitle),
    sectionTitle: mapFlatReferences(names.sectionTitle), heading: mapFlatReferences(names.heading),
    body: mapFlatReferences(names.body), control: mapFlatReferences(names.control),
    compact: mapFlatReferences(names.compact), helper: mapFlatReferences(names.helper), code: mapFlatReferences(names.code)
  });
}

/**
 * Converts one explicit variable-name group into same-shaped CSS references.
 *
 * @param names - Approved variable names.
 * @returns Same-shaped CSS variable references.
 */
function mapFlatReferences<T extends Readonly<Record<string, QuireKitThemeCssVariableName>>>(names: T): { readonly [Key in keyof T]: string } {
  return Object.freeze(Object.fromEntries(Object.entries(names).map(([key, name]) => [key, reference(name)]))) as { readonly [Key in keyof T]: string };
}
