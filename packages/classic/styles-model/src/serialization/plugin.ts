import { Decoration, DecorationSet, Plugin, type Node, type EditorState } from "@quirekit/pm";
import { markQuireDomOnlyDecorations, type QuireDecorationSpec } from "@quirekit/core";
import { resolveWordDocumentStyleRegistry } from "../model/theme/context";
import { createWordStylesHTMLSerializationTransforms } from "../serialization";
import type { WordParagraphStyleRegistry } from "../model/types";

const domOnly: QuireDecorationSpec = { quireRenderTarget: "dom" };
const reset = "font-family: inherit; font-size: inherit; font-weight: inherit; font-style: inherit; color: inherit; background-color: transparent; font-variant-caps: normal; text-transform: none; letter-spacing: normal; text-decoration-line: none; text-decoration-style: solid; text-decoration-color: currentColor; line-height: normal; text-align: start; direction: inherit; display: block; vertical-align: baseline";

/**
 * Refreshes mounted HTML after definition-only transactions. Projection is lazy
 * in the decoration reader; unchanged documents reuse the complete result.
 * Immutable-node caches bound re-projection to edited paragraphs or a new registry.
 * @param types - Textblock owners admitted by the extension.
 * @returns DOM-only appearance plugin.
 */
export function createWordStylesHtmlPlugin(types: readonly string[]): Plugin {
  const cache = new WeakMap<WordParagraphStyleRegistry, WeakMap<Node, string>>();
  let previous: Node | null = null, result = DecorationSet.empty;
  return markQuireDomOnlyDecorations(new Plugin({ props: { decorations(state: EditorState) {
    if (state.doc === previous) return result;
    previous = state.doc;
    const registry = resolveWordDocumentStyleRegistry(state.doc.attrs), transforms = createWordStylesHTMLSerializationTransforms(types, () => registry);
    const nodes = cache.get(registry) ?? new WeakMap<Node, string>(); cache.set(registry, nodes);
    const values: Decoration[] = [];
    state.doc.descendants((node, position) => {
      const transform = transforms[node.type.name];
      if (!transform) return true;
      let style = nodes.get(node);
      if (style === undefined) {
        const output = transform(node, ["p", {}, 0]);
        const attrs = Array.isArray(output) && typeof output[1] === "object" ? output[1] as Record<string, unknown> : {};
        style = `${reset}; ${typeof attrs.style === "string" ? attrs.style : ""}`;
        nodes.set(node, style);
      }
      values.push(Decoration.node(position, position + node.nodeSize, { style }, domOnly));
      return false;
    });
    result = DecorationSet.create(state.doc, values); return result;
  } } }));
}
