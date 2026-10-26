import type { QuireJSONContent } from "@quirekit/core";
import { docx } from "@quirekit/lit-docx-contract";

type QuireMark = NonNullable<QuireJSONContent["marks"]>[number];

/** Bidirectional DOCX codec owned by the text node extension. */
export const textDocxCodec = docx.codec.node<
  QuireJSONContent,
  QuireMark
>({
  id: "extension.text",
  modelType: "text",
  import: {
    from: "text",
    creates: [{
      modelType: "hardBreak",
      capability: {
        disposition: "native",
        note:
          "LitAST stores hard breaks as newline characters inside text nodes."
      }
    }],
    convert: ({ node, convertMarks }) => {
      const marks = convertMarks(node.marks ?? []);
      const parts = (node.text ?? "").split("\n");
      const content: QuireJSONContent[] = [];
      for (const [index, part] of parts.entries()) {
        if (part.length > 0) {
          content.push({
            type: "text",
            text: part,
            ...(marks.length === 0 ? {} : { marks: [...marks] })
          });
        }
        if (index < parts.length - 1) {
          content.push({
            type: "hardBreak",
            ...(marks.length === 0 ? {} : { marks: [...marks] })
          });
        }
      }
      return content;
    }
  },
  export: {
    convert: ({ node, convertMarks, docx: api }) => [
      api.inline.text(node.text ?? "", {
        ...(node.marks === undefined
          ? {}
          : { marks: [...convertMarks(node.marks)] })
      })
    ]
  }
});
