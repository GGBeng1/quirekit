import { styleTemplates } from "./styles";
import { workTemplates } from "./work";
import { lifeTemplates } from "./life";
import { analysisTemplates } from "./analysis";
import type { MindMapTemplateRecipe } from "../types";

/** Original source definitions; the public factory validates and detaches every instance. */
export const mindMapTemplateRecipes: readonly MindMapTemplateRecipe[] = [
  ...styleTemplates, ...workTemplates, ...lifeTemplates, ...analysisTemplates,
];
