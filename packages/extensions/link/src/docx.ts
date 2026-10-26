import type { QuireJSONContent } from "@quirekit/core";
import { docx } from "@quirekit/lit-docx-contract";
import { normalizeLinkHref } from "./href";

type QuireMark = NonNullable<QuireJSONContent["marks"]>[number];

/** Bidirectional DOCX codec owned by the safe-link mark extension. */
export const linkDocxCodec = docx.codec.mark<QuireMark>({
  id: "extension.link",
  modelType: "link",
  import: {
    from: "link",
    convert: ({ mark, path, lossPolicy, report }) => {
      const href = normalizeLinkHref(mark.attrs?.href);
      if (href !== null) {
        return [{ type: "link", attrs: { href } }];
      }
      if (lossPolicy === "strict") {
        throw new Error(`Unsafe LitAST link target at ${path}.attrs.href.`);
      }
      report({
        code: "unsafe-link-dropped",
        message: "Dropped an unsafe LitAST link mark while retaining its text.",
        schemaField: "link.href",
        sourceField: "marks.link.attrs.href",
        severity: "error",
        disposition: "unsupported"
      });
      return [];
    }
  },
  export: {
    convert: ({ mark, path, lossPolicy, report, docx: api }) => {
      const href = normalizeLinkHref(mark.attrs?.href);
      if (href !== null) {
        return [api.marks.link({ href })];
      }
      if (lossPolicy === "strict") {
        throw new Error(`Unsafe Quire link target at ${path}.attrs.href.`);
      }
      report({
        code: "unsafe-link-dropped",
        message: "Dropped an unsafe Quire link mark while retaining its text.",
        schemaField: "link.href",
        sourceField: "marks.link.attrs.href",
        severity: "error",
        disposition: "unsupported"
      });
      return [];
    }
  },
  capabilities: {
    fields: ["href"]
  }
});
