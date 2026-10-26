import { createUiThemeCssVariables, defaultTheme, type QuireKitTheme } from "@quirekit/ui";
import { shallowRef, type ShallowRef } from "vue";

const themes = new WeakMap<HTMLElement, ShallowRef<QuireKitTheme>>();

/**
 * Returns the owning instance theme without reading computed CSS.
 * @param root - Product root owning an independently mounted surface.
 * @returns Shared immutable theme; unmounted standalone surfaces use the shared default.
 */
export function readClassicEditorTheme(root: HTMLElement): QuireKitTheme {
  let state = themes.get(root);
  if (state === undefined) {
    state = shallowRef(defaultTheme);
    themes.set(root, state);
  }
  return state.value;
}

/**
 * Projects shared variables for a teleported surface of one instance.
 * @param root - Owning product root.
 * @returns QuireKit CSS variables derived from the same object as Canvas colors.
 */
export function readClassicEditorThemeVariables(root: HTMLElement): Readonly<Record<string, string>> {
  return createUiThemeCssVariables(readClassicEditorTheme(root));
}

/**
 * Applies the shared theme to one product root without changing document semantics.
 * @param root - Product root.
 * @param theme - Complete shared QuireKit theme.
 */
export function applyClassicEditorTheme(root: HTMLElement, theme: QuireKitTheme): void {
  readClassicEditorTheme(root);
  themes.get(root)!.value = theme;
  root.style.colorScheme = theme.scheme;
  for (const [name, value] of Object.entries(createUiThemeCssVariables(theme))) {
    root.style.setProperty(name, value);
  }
}
