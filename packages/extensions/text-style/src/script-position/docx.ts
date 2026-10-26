import type { QuireJSONContent } from "@quirekit/core";
import { docx } from "@quirekit/lit-docx-contract";

type QuireMark = NonNullable<QuireJSONContent["marks"]>[number];

/** DOCX codec for the semantic superscript mark. */
export const superscriptDocxCodec = createScriptPositionDocxCodec("superscript");

/** DOCX codec for the semantic subscript mark. */
export const subscriptDocxCodec = createScriptPositionDocxCodec("subscript");

/**
 * Creates one preservation-aware script-position codec.
 *
 * @param type - Canonical LitAST and Quire mark name.
 * @returns Bidirectional DOCX mark codec.
 */
function createScriptPositionDocxCodec(type: "superscript" | "subscript") {
  return docx.codec.mark<QuireMark>({
    id: `extension.${type}`,
    modelType: type,
    import: {
      from: type,
      convert: ({ mark }) => [{
        type,
        ...(mark.attrs === undefined
          ? {}
          : { attrs: { litAstMarkAttrs: mark.attrs } })
      }]
    },
    export: {
      convert: ({ mark }) => {
        const value = mark.attrs?.litAstMarkAttrs;
        return [{
          type,
          ...(isRecord(value) ? { attrs: value } : {})
        }];
      }
    },
    capabilities: {
      fields: [{
        field: "litAstMarkAttrs",
        import: {
          disposition: "preserved",
          preservation: {
            authority: `Imported LitAST ${type} attributes remain authoritative.`,
            invalidation: `Removing or replacing the ${type} mark discards them.`
          }
        },
        export: {
          disposition: "preserved",
          preservation: {
            authority: `Imported LitAST ${type} attributes remain authoritative.`,
            invalidation: `Removing or replacing the ${type} mark discards them.`
          }
        }
      }]
    }
  });
}

/**
 * Checks a candidate plain record.
 *
 * @param value - Candidate attribute value.
 * @returns Whether the value is a non-array record.
 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
