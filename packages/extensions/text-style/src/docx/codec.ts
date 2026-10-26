import type { QuireJSONContent } from "@quirekit/core";
import { docx } from "@quirekit/lit-docx-contract";
import { readRecord } from "./attributes";
import {
  exportLitAstTextStyleSnapshot,
  importLitAstTextStyleSnapshot
} from "./snapshot";

type QuireMark = NonNullable<QuireJSONContent["marks"]>[number];

/** Bidirectional structural codec owned by the textStyle mark extension. */
export const textStyleDocxCodec = docx.codec.mark<QuireMark>({
  id: "extension.text-style",
  modelType: "textStyle",
  import: {
    from: "textStyle",
    convert({ mark, path, composeAttributes }) {
      const source = readRecord(mark.attrs) ?? {};
      const builtIn = importLitAstTextStyleSnapshot(source, path);

      const attributes = composeAttributes("textStyle", source, builtIn);
      return Object.keys(attributes).length === 0
        ? []
        : [{ type: "textStyle", attrs: attributes }];
    }
  },
  export: {
    convert({ mark, path, composeAttributes }) {
      const source = readRecord(mark.attrs) ?? {};
      const builtIn = exportLitAstTextStyleSnapshot(source, path);

      const attributes = composeAttributes("textStyle", source, builtIn);
      if (Object.keys(attributes).length === 0) {
        throw new Error(`Unsupported empty Quire textStyle mark at ${path}.`);
      }
      return [{ type: "textStyle", attrs: attributes }];
    }
  },
  capabilities: {
    fields: [
      "fontFamily",
      "fontFamilyLatin",
      "fontFamilyEastAsia",
      "fontFamilyComplexScript",
      "fontSize",
      "fontSizeComplexScript",
      "letterSpacing", "textScale",
      "characterGrid",
      "bold",
      "italic",
      "allCaps",
      "smallCaps",
      "boldCs",
      "italicCs",
      "rightToLeft",
      "hidden",
      "outline",
      "shadow",
      "emboss",
      "imprint",
      "emphasisMark",
      "languageLatin",
      "languageEastAsia",
      "languageComplexScript",
      "color",
      "backgroundColor",
      {
        field: "litAstTextStylePreservation",
        import: {
          disposition: "preserved",
          preservation: {
            authority: "Imported LitAST textStyle producer attributes.",
            invalidation:
              "Color edits invalidate related theme references; run-format edits invalidate only their owned preserved w:rPr fields."
          }
        },
        export: {
          disposition: "preserved",
          preservation: {
            authority: "Imported LitAST textStyle producer attributes.",
            invalidation:
              "Color edits invalidate related theme references; run-format edits invalidate only their owned preserved w:rPr fields."
          }
        }
      }
    ]
  }
});
