import { get } from "node-emoji";
import type { MarkdownConfig } from "@quirekit/lezer-markdown";
import type { EmojiOptions } from "./types";

const shortcuts: Readonly<Record<string, string>> = { ":)": "smile", ":-)": "smile", ":(": "frowning", ":-(": "frowning",
  ";)": "wink", ";-)": "wink", ":D": "smiley", ":-D": "smiley", "8-)": "sunglasses", ":P": "stuck_out_tongue", ":-P": "stuck_out_tongue" };

/** @param source - Exact shortcode or admitted emoticon. @param options - Instance-local policy. @returns Unicode content, or undefined for an unknown spelling. */
export function emojiText(source: string, options: EmojiOptions): string | undefined {
  const name = source.startsWith(":") && source.endsWith(":") ? source.slice(1, -1) : options.emoticons ? shortcuts[source] : undefined;
  if (!name) return undefined;
  return Object.hasOwn(options.definitions, name) ? options.definitions[name] : get(name);
}

/** @param options - Independent instance defaults. @returns Known-only syntax; URLs and code remain owned by their earlier parsers. */
export function emojiSyntax(options: EmojiOptions): MarkdownConfig {
  return { defineNodes: ["Emoji"], parseInline: [{ name: "Emoji",
    /** @param context - Canonical inline text. @param next - Current character. @param position - UTF-16 offset. @returns Exact emoji range or rejection. */
    parse(context, next, position) {
      if (![58, 59, 56].includes(next)) return -1;
      const rest = context.slice(position, Math.min(context.end, position + 100));
      const shortcode = /^:[a-zA-Z0-9_+-]+:/u.exec(rest)?.[0];
      let spelling = shortcode;
      if (!spelling && options.emoticons && (position === context.offset || /\s/u.test(context.slice(position - 1, position)))) {
        spelling = Object.keys(shortcuts).find(value => rest.startsWith(value) && (rest.length === value.length || /\s/u.test(rest[value.length]!)));
      }
      return spelling && emojiText(spelling, options)
        ? context.addElement(context.elt("Emoji", position, position + spelling.length)) : -1;
    },
  }] };
}
