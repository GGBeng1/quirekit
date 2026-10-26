import type { BlockContext, BlockParser, Line } from "@quirekit/lezer-markdown";

/**
 * Parses explicit source containers inside the one incremental Markdown parser.
 * @param name - Public confirmed node kind.
 * @param opening - Exact opening marker matcher.
 * @param documentStart - Whether only the document's first line may open this container.
 * @returns A block parser preserving delimiter and raw-body ranges.
 */
export function fencedContainer(name: string, opening: RegExp, documentStart = false): BlockParser {
  return { name, before: "HorizontalRule",
    /** @param context - Canonical incremental block owner. @param line - Current source line. @returns Whether a container was accepted. */
    parse(context: BlockContext, line: Line) {
      if (line.indent - line.baseIndent >= 4 || documentStart && (context.lineStart !== 0 || context.depth !== 1)) return false;
      const match = opening.exec(line.text.slice(line.pos));
      if (!match) return false;
      const marker = match[0].trim(), start = context.lineStart + line.pos;
      let quotes = 0, list = false;
      for (let depth = 1; depth < context.depth; depth++) {
        const parent = context.parentType(depth).name;
        if (parent === "Blockquote") quotes++;
        if (parent === "ListItem") list = true;
      }
      const baseIndent = line.baseIndent;
      const children = [context.elt(`${name}Mark`, start, context.lineStart + line.text.length)];
      let end = context.lineStart + line.text.length;
      // The container owns raw text until its exact closing delimiter. Unclosed containers
      // remain source-only, avoiding speculative rendering during incomplete typing.
      while (context.nextLine()) {
        // A closing delimiter belongs to the opening composite context. Leave the
        // first outside line untouched so the outer parser can start its own block.
        const continuedQuotes = line.markers.filter(mark => context.parser.nodeSet.types[mark.type]?.name === "QuoteMark").length;
        if (continuedQuotes < quotes || list && line.text.trim() && line.baseIndent < baseIndent) break;
        end = context.lineStart + line.text.length;
        children.push(...line.markers);
        if (line.text.slice(line.pos).trim() === marker && line.indent - line.baseIndent < 4) {
          children.push(context.elt(`${name}Mark`, context.lineStart + line.pos, end));
          context.nextLine(); break;
        }
        // The parser's composite contexts own the prefix. Preserve body whitespace and
        // empty lines as separate ranges instead of rediscovering containers with regexes.
        children.push(context.elt(`${name}Text`, context.lineStart + line.basePos, end));
      }
      context.addElement(context.elt(name, start, end, children));
      return true;
    },
  };
}
