import type { MarkdownConfig } from "@quirekit/lezer-markdown";
import { inlineFootnoteParser } from "./inline";

/** Footnote bodies re-enter the canonical block parser with a four-column continuation boundary. */
export const footnoteSyntax: MarkdownConfig = {
  defineNodes: ["InlineFootnote", "InlineFootnoteMark", "FootnoteReference", "FootnoteLabel", { name: "FootnoteDefinition", block: true,
    /** @param _context - Accepted container stack. @param line - Current body line. @returns Whether the line belongs to this definition. */
    composite(_context, line) {
      if (line.pos === line.text.length) return true;
      if (line.indent < line.baseIndent + 4) return false;
      line.moveBaseColumn(line.baseIndent + 4); return true;
    },
  }],
  parseInline: [inlineFootnoteParser, { name: "FootnoteReference", before: "Link",
    /** @param context - Canonical inline section. @param next - Current character. @param position - Source offset. @returns Reference end or rejection. */
    parse(context, next, position) {
      if (next !== 91 || context.char(position + 1) !== 94) return -1;
      const match = /^\[\^([^\]\s]+)\]/u.exec(context.slice(position, context.end));
      return match ? context.addElement(context.elt("FootnoteReference", position, position + match[0].length,
        [context.elt("FootnoteLabel", position + 2, position + match[0].length - 1)])) : -1;
    },
  }],
  parseBlock: [{ name: "FootnoteDefinition", before: "LinkReference",
    /** @param context - Canonical block section. @param line - Current source line. @returns Whether a definition was consumed. */
    parse(context, line) {
      if (line.indent - line.baseIndent >= 4) return false;
      const match = /^\[\^([^\]\s]+)\]:[ \t]*/u.exec(line.text.slice(line.pos));
      if (!match) return false;
      const start = context.lineStart + line.pos;
      context.startComposite("FootnoteDefinition", line.pos);
      context.addElement(context.elt("FootnoteLabel", start + 2, start + 2 + match[1]!.length));
      line.moveBase(line.pos + match[0].length);
      return null;
    },
    /** @param _context - Active container stack. @param line - Potential new definition. @returns Whether an adjacent definition starts a new block. */
    endLeaf(_context, line) { return line.indent - line.baseIndent < 4 && /^\[\^[^\]\s]+\]:/u.test(line.text.slice(line.pos)); },
  }],
};
