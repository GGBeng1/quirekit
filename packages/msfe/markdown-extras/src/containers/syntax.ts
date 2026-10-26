import type { MarkdownConfig } from "@quirekit/lezer-markdown";

/** @param types - Explicit host-approved names. @returns Native composite grammar; nested body blocks share the parent parser. */
export function containerSyntax(types: readonly string[]): MarkdownConfig {
  const accepted = new Set(types);
  return { defineNodes: ["ContainerMark", "ContainerName", "ContainerTitle", { name: "CustomContainer", block: true,
    /** @param context - Canonical container stack. @param line - Next body line. @param size - Opening fence length. @returns Whether the body continues, recording its closing fence before leaving. */
    composite(context, line, size) {
      const text = line.text.slice(line.pos);
      if (line.indent - line.baseIndent < 4 && /^:{3,}[ \t]*$/u.test(text) && text.trim().length >= size) {
        line.addMarker(context.elt("ContainerMark", context.lineStart + line.pos, context.lineStart + line.text.length));
        line.moveBase(line.text.length); return false;
      }
      return true;
    },
  }], parseBlock: [{ name: "CustomContainer", before: "FencedCode",
    /** @param context - Canonical block parser. @param line - Candidate opening. @returns A native composite, or ordinary source. */
    parse(context, line) {
      if (line.indent - line.baseIndent >= 4) return false;
      const match = /^(:{3,})[ \t]+([a-z][a-z0-9-]*)(?:[ \t]+(.*?))?[ \t]*$/u.exec(line.text.slice(line.pos));
      if (!match || !accepted.has(match[2]!)) return false;
      const from = context.lineStart + line.pos, nameFrom = from + match[0].indexOf(match[2]!);
      context.startComposite("CustomContainer", line.pos, match[1]!.length);
      context.addElement(context.elt("ContainerMark", from, from + match[1]!.length));
      context.addElement(context.elt("ContainerName", nameFrom, nameFrom + match[2]!.length));
      if (match[3]) {
        const titleFrom = from + match[0].indexOf(match[3], nameFrom - from + match[2]!.length);
        context.addElement(context.elt("ContainerTitle", titleFrom, titleFrom + match[3].length));
      }
      line.moveBase(line.text.length); return null;
    },
    /** @param _context - Canonical parser. @param line - Potential opener. @returns Whether an explicit registered opener interrupts a paragraph. */
    endLeaf(_context, line) {
      const match = /^:{3,}[ \t]+([a-z][a-z0-9-]*)(?:[ \t]+.*?)?[ \t]*$/u.exec(line.text.slice(line.pos));
      return line.indent - line.baseIndent < 4 && !!match && accepted.has(match[1]!);
    },
  }] };
}
