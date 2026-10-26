import type { MarkdownConfig, DelimiterType } from "@quirekit/lezer-markdown";

/**
 * Adds a paired two-character mark through the canonical delimiter resolver.
 * @param name - Syntax node family.
 * @param marker - Literal delimiter, never a regular expression.
 * @returns Grammar preserving nested inline syntax, escaping and incomplete input.
 */
export function pairedMark(name: string, marker: string): MarkdownConfig {
  const type: DelimiterType = { resolve: name, mark: `${name}Mark` };
  return { defineNodes: [name, `${name}Mark`], parseInline: [{ name,
    /** @param context - Current canonical inline block. @param next - Current character. @param position - UTF-16 source position. @returns End of a candidate pair or rejection. */
    parse(context, next, position) {
      if (next !== marker.charCodeAt(0) || context.slice(position, position + 2) !== marker) return -1;
      if (context.char(position - 1) === next || context.char(position + 2) === next) return -1;
      const before = context.slice(position - 1, position), after = context.slice(position + 2, position + 3);
      return context.addDelimiter(type, position, position + 2, !!after && !/\s/u.test(after), !!before && !/\s/u.test(before));
    },
  }] };
}
