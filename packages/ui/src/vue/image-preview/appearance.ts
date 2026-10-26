import { createTheme } from '../../theme';
import { createUiThemeCssVariables } from '../../styles';

/** @param scheme - Surface contrast appropriate for the chosen mask. @returns Semantic colors without replacing host geometry or typography. */
function colors(scheme: 'light' | 'dark'): Readonly<Record<string, string>> {
  return Object.freeze(Object.fromEntries(Object.entries(createUiThemeCssVariables(createTheme({ scheme })))
    .filter(([name]) => name.startsWith('--qk-color-') || (name.startsWith('--qk-button-') && /foreground|background|border-color|focus-color/.test(name)))));
}
/** Reuses public theme colors for preview controls on dark or light masks. */
export const previewColors = { light: colors('light'), dark: colors('dark') };
