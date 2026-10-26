import { Node, defineSource } from "@quirekit/msfe-core";
import { emojiSyntax, emojiText } from "./syntax";
import type { EmojiOptions } from "./types";

/** Optional Unicode emoji without network images, generated Markdown or another text authority. */
export const Emoji = Node.create<EmojiOptions>({ name: "emoji",
  /** @returns Full installed dictionary plus familiar emoticons, configurable per instance. */
  addOptions: () => ({ definitions: {}, emoticons: true }),
  /** @returns Known-only grammar isolated by the canonical inline parser. */
  addMarkdownExtensions() { return emojiSyntax(this.options); },
  /** @returns Source-derived Unicode text. */
  addSource() { const options = this.options; return defineSource({ nodes: ["Emoji"],
    /** @param document - Canonical text. @param node - Confirmed shortcode. @returns Current configured symbol or source fallback. */
    read(document, node) { const text = emojiText(document.slice(node.from, node.to), options); return text ? { text } : null; },
    patch: () => null,
  }); },
  /** @returns Small text replacements with core-managed source reveal. */
  addProjectionLayers() { const name = this.name; return [{ key: `${name}-text`, placement: "inline",
    /** @param input - Visible canonical ranges. @returns Unicode presentation preserving source coordinates. */
    build: input => input.query(name).matches.map(match => ({ type: "replace", from: match.from, to: match.to, key: String(match.from), text: String(match.attrs.text) })),
  }]; },
});
