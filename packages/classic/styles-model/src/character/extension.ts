import { wordCharacterStyleReferences } from "../serialization/character";
import { declareQuireLayoutDependency, Mark, mergeAttributes, type QuireMarkCanvasStyle } from "@quirekit/core";
import { resolveWordParagraphFormatting } from "@quirekit/classic-paragraph-model";
import { resolveWordDocumentStyleRegistry } from "../model/theme/context";
import { resolveWordNamedParagraphStyle } from "../model/resolve";
import { resolveWordCharacterAppearance } from "./appearance";
import { wordCharacterStyleDocxCodec } from "./codec";

/** Identity-preserving Word character style; direct format marks remain separate. */
export const WordCharacterStyle = Mark.create({
  name: "wordCharacterStyle",
  priority: 110,
  /** @returns Stable style identity, independent of direct format marks. */
  addAttributes() { return { styleId: { default: null, rendered: false } }; },
  /** @returns HTML rules retaining the character-style reference. */
  parseHTML() { return [{ tag: "span[data-word-character-style]", getAttrs: element => ({ styleId: (element as HTMLElement).getAttribute("data-word-character-style") }) }]; },
  /** @param props - Current mark and host attributes. @returns Reference-based HTML wrapper. */
  renderHTML({ mark, HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-word-character-style": mark.attrs.styleId, style: wordCharacterStyleReferences(String(mark.attrs.styleId ?? "")) }), 0];
  },
  /** @param mark - Character-style occurrence. @param context - Current paragraph and document. @returns Inherited typography before direct formatting. */
  canvasStyle(mark, context): QuireMarkCanvasStyle | null {
    if (!context?.document || typeof mark.attrs.styleId !== "string") return null;
    const registry = resolveWordDocumentStyleRegistry(context.document.attrs);
    const paragraph = context.inheritedStyle ?? resolveWordNamedParagraphStyle(registry, resolveWordParagraphFormatting(context.node.attrs.wordParagraph).styleId).text;
    return { ...resolveWordCharacterAppearance(registry, mark.attrs.styleId, resolveWordParagraphFormatting(context.node.attrs.wordParagraph).styleId, paragraph), cascade: "inherited" };
  },
  /** @returns Identity-preserving DOCX mark contribution. */
  addDocx() { return [wordCharacterStyleDocxCodec]; }
});

// Character style definitions and theme resources are immutable document attributes.
declareQuireLayoutDependency(WordCharacterStyle.config.canvasStyle!, { kind: "document" });
