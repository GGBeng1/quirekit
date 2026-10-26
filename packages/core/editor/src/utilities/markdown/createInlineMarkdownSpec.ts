import type {
  MarkdownParseHelpers,
  MarkdownParseResult,
  MarkdownToken,
  MarkdownTokenizer,
  QuireJSONContent
} from "../../types";
import {
  escapeRegExp,
  parseShortcodeAttributes,
  serializeShortcodeAttributes
} from "./shared";

/** Attribute filter entry accepted by inline Markdown specs. */
export type AllowedAttribute =
  | string
  | {
      /** Attribute name. */
      readonly name: string;
      /** Value that should be skipped during serialization. */
      readonly skipIfDefault?: unknown;
    };

/** Options used to create an inline shortcode Markdown spec. */
export interface InlineMarkdownSpecOptions {
  /** Tiptap node name represented by the spec. */
  readonly nodeName: string;
  /** Shortcode name used in Markdown. */
  readonly name?: string | undefined;
  /**
   * Extracts text content during serialization.
   *
   * @param node - JSON node being serialized.
   * @returns Text content for the shortcode.
   */
  readonly getContent?: ((node: QuireJSONContent) => string) | undefined;
  /**
   * Parses shortcode attributes.
   *
   * @param attrString - Attribute source from the shortcode.
   * @returns Parsed attributes.
   */
  readonly parseAttributes?: ((attrString: string) => Record<string, unknown>) | undefined;
  /**
   * Serializes shortcode attributes.
   *
   * @param attrs - Attributes to serialize.
   * @returns Serialized attributes.
   */
  readonly serializeAttributes?: ((attrs: Record<string, unknown>) => string) | undefined;
  /** Attributes applied before parsed attributes. */
  readonly defaultAttributes?: Record<string, unknown> | undefined;
  /** Whether the shortcode has no closing tag. */
  readonly selfClosing?: boolean | undefined;
  /** Attributes allowed during serialization. */
  readonly allowedAttributes?: readonly AllowedAttribute[] | undefined;
}

/**
 * Creates a Tiptap-compatible inline Markdown shortcode spec.
 *
 * @param options - Inline shortcode options.
 * @returns Parser, tokenizer, and renderer for the inline spec.
 */
export function createInlineMarkdownSpec(options: InlineMarkdownSpecOptions): {
  /** Parses a tokenizer token into JSON content. */
  parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) => MarkdownParseResult;
  /** Tokenizer consumed by marked-compatible Markdown managers. */
  markdownTokenizer: MarkdownTokenizer;
  /** Serializes JSON content to Markdown. */
  renderMarkdown: (node: QuireJSONContent) => string;
} {
  const shortcode = options.name ?? options.nodeName;
  const escapedShortcode = escapeRegExp(shortcode);
  const parseAttributes = options.parseAttributes ?? parseShortcodeAttributes;
  const serializeAttributes = options.serializeAttributes ?? serializeShortcodeAttributes;
  const defaultAttributes = options.defaultAttributes ?? {};
  const selfClosing = options.selfClosing ?? false;

  return {
    parseMarkdown: (token, helpers) => {
      const attrs = {
        ...defaultAttributes,
        ...(token.attributes ?? {})
      };

      if (selfClosing) {
        return helpers.createNode(options.nodeName, attrs);
      }

      const content = options.getContent
        ? options.getContent(token as unknown as QuireJSONContent)
        : token.content ?? "";

      return helpers.createNode(
        options.nodeName,
        attrs,
        content ? [helpers.createTextNode(content)] : []
      );
    },

    markdownTokenizer: {
      name: options.nodeName,
      level: "inline",
      start(source) {
        const pattern = selfClosing
          ? new RegExp(`\\[${escapedShortcode}\\s*[^\\]]*\\]`)
          : new RegExp(`\\[${escapedShortcode}\\s*[^\\]]*\\][\\s\\S]*?\\[\\/${escapedShortcode}\\]`);
        const index = source.match(pattern)?.index;

        return index ?? -1;
      },
      tokenize(source) {
        const pattern = selfClosing
          ? new RegExp(`^\\[${escapedShortcode}\\s*([^\\]]*)\\]`)
          : new RegExp(`^\\[${escapedShortcode}\\s*([^\\]]*)\\]([\\s\\S]*?)\\[\\/${escapedShortcode}\\]`);
        const match = source.match(pattern);

        if (!match) {
          return undefined;
        }

        const attrString = selfClosing ? match[1] ?? "" : match[1] ?? "";
        const content = selfClosing ? "" : match[2] ?? "";

        return {
          type: options.nodeName,
          raw: match[0],
          content: content.trim(),
          attributes: parseAttributes(attrString.trim())
        };
      }
    },

    renderMarkdown: (node) => {
      const content = options.getContent
        ? options.getContent(node)
        : (node.content ?? [])
          .filter((child) => child.type === "text")
          .map((child) => child.text ?? "")
          .join("");
      const attrs = serializeAttributes(filterInlineAttributes(
        node.attrs ?? {},
        options.allowedAttributes
      ));
      const attrString = attrs ? ` ${attrs}` : "";

      return selfClosing
        ? `[${shortcode}${attrString}]`
        : `[${shortcode}${attrString}]${content}[/${shortcode}]`;
    }
  };
}

/**
 * Filters inline attributes with support for default-skipping entries.
 *
 * @param attrs - Source attributes.
 * @param allowedAttributes - Attribute filter entries.
 * @returns Filtered attributes.
 */
function filterInlineAttributes(
  attrs: Readonly<Record<string, unknown>>,
  allowedAttributes?: readonly AllowedAttribute[] | undefined
): Record<string, unknown> {
  if (!allowedAttributes) {
    return { ...attrs };
  }

  const filtered: Record<string, unknown> = {};

  for (const attribute of allowedAttributes) {
    const name = typeof attribute === "string" ? attribute : attribute.name;
    const skipIfDefault = typeof attribute === "string"
      ? undefined
      : attribute.skipIfDefault;

    if (!Object.prototype.hasOwnProperty.call(attrs, name)) {
      continue;
    }

    if (skipIfDefault !== undefined && attrs[name] === skipIfDefault) {
      continue;
    }

    filtered[name] = attrs[name];
  }

  return filtered;
}
