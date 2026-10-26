import { palettes } from "../templates/recipes/palettes";
import type { MindMapTheme, MindMapThemeId } from "./types";
/** Original document themes, separate from host light/dark UI. */
export const mindMapThemes: readonly MindMapTheme[] = Object.freeze(Object.entries(palettes).map(([id, palette]) =>
  Object.freeze({ id: id as MindMapThemeId, colors: Object.freeze([palette.root, ...palette.accents, ...palette.tints]) })));
