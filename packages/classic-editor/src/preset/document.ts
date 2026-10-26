import {
  quireDefaultDocumentFontTheme,
  type QuireJSONContent
} from "@quirekit/core";
import {
  defaultClassicEditorLocale,
  resolveBuiltinClassicEditorMessage
} from "../localization";
import type { ClassicEditorLocale } from "../types";

/**
 * Creates the product-neutral Classic starter document.
 *
 * @param locale - Locale used only for product-owned starter copy.
 * @returns Canonical ProseMirror JSON using only generic starter-kit nodes.
 */
export function createClassicEditorDefaultDocument(
  locale: ClassicEditorLocale = defaultClassicEditorLocale
): QuireJSONContent {
  const untitled = resolveBuiltinClassicEditorMessage(locale, "untitledDocument");
  const starter = resolveBuiltinClassicEditorMessage(locale, "starterDocument");
  return {
    type: "doc",
    attrs: {
      fontTheme: quireDefaultDocumentFontTheme
    },
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: untitled }]
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: starter
          }
        ]
      }
    ]
  };
}
