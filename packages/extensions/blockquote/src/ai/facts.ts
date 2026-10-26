import type { QuireAiCapability } from "@quirekit/ai-contract";

/**
 * Declares quotation blocks as a paragraph format: the view lists a quote's paragraphs as
 * ordinary blocks, each marked `quote:true`, and setting the format wraps or unwraps them.
 * @param name - Blockquote node name.
 * @returns Paragraph format read from the paragraph's ancestors.
 */
export function createBlockquoteAiCapabilities(name: string): readonly QuireAiCapability[] {
  return [{
    kind: "format",
    name: "quote",
    level: "paragraph",
    description: "Sets the paragraphs apart as a quotation block (true); null takes them out of it.",
    present: { label: "引用块" },
    schema: { type: "boolean" },
    read: target => {
      if (target.level !== "paragraph" || target.pos === undefined) return undefined;
      const $pos = target.doc.resolve(target.pos);
      for (let depth = $pos.depth; depth > 0; depth -= 1) if ($pos.node(depth).type.name === name) return true;
      return undefined;
    },
    apply: ({ commands }, value) => value === true ? commands.setBlockquote() : commands.unsetBlockquote()
  }];
}
