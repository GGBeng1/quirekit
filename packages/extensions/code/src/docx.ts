import type { QuireJSONContent } from "@quirekit/core";
import { docx } from "@quirekit/lit-docx-contract";

type QuireMark = NonNullable<QuireJSONContent["marks"]>[number];

/** Bidirectional DOCX codec owned by the inline-code mark extension. */
export const codeDocxCodec = docx.codec.mark<QuireMark>({
  id: "extension.code",
  modelType: "code",
  import: {
    from: "code",
    convert: ({ mark }) => [{
      type: "code",
      ...(mark.attrs === undefined
        ? {}
        : { attrs: { litAstMarkAttrs: mark.attrs } })
    }]
  },
  export: {
    convert: ({ mark }) => {
      const value = mark.attrs?.litAstMarkAttrs;
      return [{
        type: "code",
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
          authority: "Imported LitAST code attributes remain authoritative.",
          invalidation: "Removing or replacing the code mark discards them."
        }
      },
      export: {
        disposition: "preserved",
        preservation: {
          authority: "Imported LitAST code attributes remain authoritative.",
          invalidation: "Removing or replacing the code mark discards them."
        }
      }
    }]
  }
});

/**
 * Checks a candidate plain record.
 *
 * @param value - Candidate attribute value.
 * @returns Whether the value is a non-array record.
 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
