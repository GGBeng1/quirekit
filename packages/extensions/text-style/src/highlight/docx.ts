import type { QuireJSONContent } from "@quirekit/core";
import { docx } from "@quirekit/lit-docx-contract";
import { normalizeHighlightToken, resolveHighlightTokenFromCss } from "./normalize";

type QuireMark = NonNullable<QuireJSONContent["marks"]>[number];

/** Bidirectional DOCX codec owned by the highlight mark extension. */
export const highlightDocxCodec = docx.codec.mark<QuireMark>({
  id: "extension.highlight",
  modelType: "highlight",
  import: {
    from: "highlight",
    convert: ({ mark }) => [{
      type: "highlight",
      attrs: { color: readColor(mark.attrs?.color) }
    }]
  },
  export: {
    convert: ({ mark, docx: api }) => {
      const token = readExportToken(mark.attrs?.color);
      return token === null ? [] : [api.marks.highlight(token)];
    }
  },
  capabilities: {
    fields: ["color"]
  }
});

/**
 * Reads the canonical non-empty highlight token.
 *
 * @param value - Candidate source or model attribute.
 * @returns Trimmed token, defaulting to Word yellow.
 */
function readColor(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : "yellow";
}

/**
 * Resolves the `w:val` written for a model color; OOXML only accepts named tokens.
 *
 * @param value - Model color: a token, or a CSS color from older or API-authored content.
 * @returns Valid token, or null when the color is transparent and no highlight is written.
 */
function readExportToken(value: unknown): string | null {
  const color = readColor(value);
  const token = normalizeHighlightToken(color) ?? resolveHighlightTokenFromCss(color);
  return token === undefined ? "yellow" : token;
}
