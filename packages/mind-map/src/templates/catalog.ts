import { mindMapTemplateRecipes } from "./recipes/catalog";
import type { MindMapTemplate } from "./types";

/** Immutable metadata shared by every host; callers create source explicitly. */
export const mindMapTemplates: readonly MindMapTemplate[] = Object.freeze(mindMapTemplateRecipes.map(({ id, title, description, category }) =>
  Object.freeze({ id, title, description, category })));
