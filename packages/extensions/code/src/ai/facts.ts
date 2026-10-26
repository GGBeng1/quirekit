import type { QuireAiCapability } from "@quirekit/ai-contract";

/**
 * Declares inline code as a character format.
 * @param name - Code mark name.
 * @returns Character format read from the mark and written through the code commands.
 */
export function createCodeAiCapabilities(name: string): readonly QuireAiCapability[] {
  return [{
    kind: "format",
    name: "code",
    level: "character",
    description: "Inline code in a monospace font, such as a command or a variable name (true); it replaces the text's other formatting.",
    present: { label: "行内代码" },
    schema: { type: "boolean" },
    read: target => target.level === "character" && target.marks.some(mark => mark.type.name === name) ? true : undefined,
    apply: ({ commands }, value) => value === true ? commands.setCode() : commands.unsetCode()
  }];
}
