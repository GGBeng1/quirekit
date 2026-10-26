import type { MarkdownConfig } from "@quirekit/lezer-markdown";

/** Single-line, literal abbreviation definitions; inline use is resolved after accepted parsing. */
export const abbreviationSyntax: MarkdownConfig = {
  defineNodes: ["AbbreviationDefinition", "AbbreviationLabel", "AbbreviationTitle"],
  parseBlock: [{ name: "AbbreviationDefinition", before: "LinkReference",
    /** @param context - Canonical block parser. @param line - Candidate definition. @returns Whether a complete definition was accepted. */
    parse(context, line) {
      if (line.indent - line.baseIndent >= 4) return false;
      const match = /^\*\[((?:\\.|[^\]\\])+)\]:[ \t]*(.*\S)[ \t]*$/u.exec(line.text.slice(line.pos));
      if (!match) return false;
      const from = context.lineStart + line.pos, labelEnd = from + 2 + match[1]!.length;
      const titleFrom = from + match[0].length - match[2]!.length - (/\s*$/u.exec(match[0])?.[0].length ?? 0);
      context.addElement(context.elt("AbbreviationDefinition", from, context.lineStart + line.text.length, [
        context.elt("AbbreviationLabel", from + 2, labelEnd),
        context.elt("AbbreviationTitle", titleFrom, titleFrom + match[2]!.length),
      ]));
      context.nextLine(); return true;
    },
  }],
};
