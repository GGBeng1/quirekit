import type { QuireJSONContent } from "@quirekit/core";
import {
  createLitAstNodePreservation,
  docx,
  readLitAstNodePreservation
} from "@quirekit/lit-docx-contract";

type QuireMark = NonNullable<QuireJSONContent["marks"]>[number];

/** Bidirectional DOCX codec owned by the blockquote node extension. */
export const blockquoteDocxCodec = docx.codec.node<
  QuireJSONContent,
  QuireMark
>({
  id: "extension.blockquote",
  modelType: "blockquote",
  import: {
    from: "blockquote",
    convert: ({ node, convertChildren }) => [{
      type: "blockquote",
      attrs: {
        litAstNodePreservation: createLitAstNodePreservation(node)
      },
      content: [...convertChildren(node.children ?? [])]
    }]
  },
  export: {
    convert: ({ node, convertChildren }) => {
      const preserved = readLitAstNodePreservation(
        readRecord(node.attrs)?.litAstNodePreservation
      );
      const attrs = readRecord(preserved.attrs);
      const meta = readRecord(preserved.meta);
      return [{
        type: "blockquote",
        ...(attrs === undefined ? {} : { attrs }),
        ...(typeof preserved.rawXml === "string"
          ? { rawXml: preserved.rawXml }
          : {}),
        ...(meta === undefined ? {} : { meta }),
        ...(node.content === undefined
          ? {}
          : { children: [...convertChildren(node.content)] })
      }];
    }
  },
  capabilities: {
    fields: [
      {
        field: "wordNodeRevision",
        export: {
          disposition: "unsupported",
          diagnosticCodes: ["word-node-revision-export-unsupported"],
          note: "Whole-blockquote insertion review remains editor-native until an OOXML projection is admitted."
        }
      },
      {
        field: "litAstNodePreservation",
        import: {
          disposition: "preserved",
          preservation: {
            authority: "Imported LitAST attrs, rawXml, and metadata.",
            invalidation: "An explicit blockquote source-preservation edit."
          }
        },
        export: {
          disposition: "preserved",
          preservation: {
            authority: "Imported LitAST attrs, rawXml, and metadata.",
            invalidation: "An explicit blockquote source-preservation edit."
          }
        }
      }
    ]
  }
});

/**
 * Reads one record without accepting arrays.
 *
 * @param value - Candidate record.
 * @returns Record or undefined.
 */
function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}
