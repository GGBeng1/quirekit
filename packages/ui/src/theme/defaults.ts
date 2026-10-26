import { createTheme } from "./create";

/** Shared immutable theme for consumers without an explicit theme. */
export const defaultTheme = createTheme();

/** DOM-independent semantic colors shared by default DOM, Canvas and SVG consumers. */
export const defaultThemeColors = defaultTheme.color;
