import type { QuireAiCapability } from "@quirekit/ai-contract";
import { resolveWordParagraphFormatting } from "../model";

/** Paragraph base direction, read and written as the paragraph's own value. */
export const wordParagraphDirectionAiCapability: QuireAiCapability = {
  kind: "format",
  name: "direction",
  level: "paragraph",
  description: "Text direction of the paragraph: \"rtl\" (right to left, as for Arabic or Hebrew) or \"ltr\".",
  schema: { enum: ["rtl", "ltr"] },
  present: { label: "文字方向", value: value => value === "rtl" ? "从右到左" : "从左到右" },
  read: target => target.level === "paragraph" && target.node.attrs.wordParagraph !== undefined
    ? resolveWordParagraphFormatting(target.node.attrs.wordParagraph).direction ?? undefined
    : undefined,
  apply: ({ commands }, value) => commands.setWordParagraphProperties({ properties: { direction: value === "rtl" || value === "ltr" ? value : null } })
};
