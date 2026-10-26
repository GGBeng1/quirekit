import type { QuireAiCapability } from "@quirekit/ai-contract";

/**
 * Declares code blocks as a paragraph format whose value is the code language, or true.
 * @param name - Code block node name.
 * @returns Paragraph format converting between paragraphs and code blocks.
 */
export function createCodeBlockAiCapabilities(name: string): readonly QuireAiCapability[] {
  return [{
    kind: "format",
    name: "codeBlock",
    level: "paragraph",
    description: "Shows the block as a code block in a monospace font: true, or the code language such as \"python\"; null turns it back into a paragraph.",
    present: { label: "代码块", value: value => value === true ? "是" : String(value) },
    schema: { anyOf: [{ type: "boolean", const: true }, { type: "string", pattern: "^[A-Za-z0-9+#._-]{1,32}$" }] },
    read: target => {
      if (target.level !== "paragraph" || target.node.type.name !== name) return undefined;
      const language = target.node.attrs.language;
      return typeof language === "string" && language !== "" ? language : true;
    },
    apply: ({ commands, tr, from }, value) => {
      // Toggling an existing code block turns it back into a paragraph.
      if (value === null) return tr.doc.resolve(from).parent.type.name !== name || commands.toggleCodeBlock();
      return commands.setCodeBlock(typeof value === "string" ? { language: value } : {});
    }
  }];
}
