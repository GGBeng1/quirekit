import { readMindMapDocument } from "../model/document";
import type { MindMapDocument, MindMapNode } from "../model/types";
import { mindMapTemplateRecipes } from "./recipes/catalog";
import { templateNodeStyle } from "./style";
import type { MindMapTemplateId, MindMapTemplateTopic } from "./types";

/** @param id - Catalog identity. @returns Fresh immutable source without host or viewport state. */
export function createMindMapTemplate(id: MindMapTemplateId): MindMapDocument {
  const recipe = mindMapTemplateRecipes.find(template => template.id === id);
  if (!recipe) throw new RangeError("template: unknown identity");
  const { design } = recipe;
  let identity = 0;
  /** @param topic - Recursive content. @param depth - Root-relative level. @param branch - Palette lane. @returns Fresh canonical node candidate. */
  function visit(topic: MindMapTemplateTopic, depth: number, branch: number): MindMapNode {
    const [text, children] = typeof topic === "string" ? [topic, []] : topic;
    const id = `topic-${++identity}`;
    return { id, text, collapsed: false, style: templateNodeStyle(design, depth, branch),
      children: children.map((child, index) => visit(child, depth + 1, depth === 0 ? index : branch)) };
  }
  // Source owns design and hierarchy. Validate/freeze once; viewport geometry is
  // left to the same renderer used by the editor, exports and gallery previews.
  return readMindMapDocument({ version: 3, revision: 0, layout: recipe.layout ?? "mind-map",
    root: visit([recipe.root, recipe.branches], 0, 0), floatingTopics: [] });
}
