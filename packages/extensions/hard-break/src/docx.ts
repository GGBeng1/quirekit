import type { QuireJSONContent } from "@quirekit/core";
import { docx } from "@quirekit/lit-docx-contract";

type QuireMark = NonNullable<QuireJSONContent["marks"]>[number];

/** Export codec owned by the hard-break node extension. */
export const hardBreakDocxCodec =
  docx.codec.node<QuireJSONContent, QuireMark>({
    id: "extension.hard-break",
    modelType: "hardBreak",
    export: {
      convert: ({ node, convertMarks, docx: api }) => [api.inline.text("\n", {
        ...(node.marks === undefined
          ? {}
          : { marks: [...convertMarks(node.marks)] })
      })]
    }
  });
