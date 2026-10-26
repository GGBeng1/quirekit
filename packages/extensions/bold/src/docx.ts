import type { QuireJSONContent } from "@quirekit/core";
import { docx } from "@quirekit/lit-docx-contract";

type QuireMark = NonNullable<QuireJSONContent["marks"]>[number];

/** Bidirectional DOCX codec owned by the bold mark extension. */
export const boldDocxCodec = docx.codec.mark<QuireMark>({
  id: "extension.bold",
  modelType: "bold",
  import: {
    from: "bold",
    convert: ({ mark }) => [{
      type: "bold",
      ...(mark.attrs === undefined
        ? {}
        : { attrs: { litAstMarkAttrs: mark.attrs } })
    }]
  },
  export: {
    convert: ({ mark }) => [{
      type: "bold",
      ...readPreservedAttributes(mark)
    }]
  },
  capabilities: {
    fields: [{
      field: "litAstMarkAttrs",
      import: {
        disposition: "preserved",
        preservation: {
          authority: "Imported LitAST bold attributes remain authoritative.",
          invalidation: "Removing or replacing the bold mark discards them."
        }
      },
      export: {
        disposition: "preserved",
        preservation: {
          authority: "Imported LitAST bold attributes remain authoritative.",
          invalidation: "Removing or replacing the bold mark discards them."
        }
      }
    }]
  }
});

/**
 * Restores producer attributes retained on one canonical mark.
 *
 * @param mark - Canonical bold mark.
 * @returns Optional LitAST attribute property.
 */
function readPreservedAttributes(
  mark: QuireMark
): { readonly attrs?: Readonly<Record<string, unknown>> } {
  const value = mark.attrs?.litAstMarkAttrs;
  return isRecord(value) ? { attrs: value } : {};
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
