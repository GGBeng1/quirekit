import type {
  MarkdownParseHelpers,
  MarkdownParseResult,
  MarkdownToken,
  MarkdownTokenizer,
  QuireJSONContent
} from "../../types";
import {
  parseAttributes as defaultParseAttributes,
  serializeAttributes as defaultSerializeAttributes
} from "./attributeUtils";
import { filterAllowedAttributes } from "./shared";

/** Options used to create an atom block Markdown spec. */
export interface AtomBlockMarkdownSpecOptions {
  /** Tiptap node name represented by the spec. */
  readonly nodeName: string;
  /** Markdown block name used in source text. */
  readonly name?: string | undefined;
  /**
   * Parses block attributes.
   *
   * @param attrString - Raw attribute string.
   * @returns Parsed attributes.
   */
  readonly parseAttributes?: ((attrString: string) => Record<string, unknown>) | undefined;
  /**
   * Serializes block attributes.
   *
   * @param attrs - Attributes to serialize.
   * @returns Serialized attribute string.
   */
  readonly serializeAttributes?: ((attrs: Record<string, unknown>) => string) | undefined;
  /** Attributes applied before parsed attributes. */
  readonly defaultAttributes?: Record<string, unknown> | undefined;
  /** Required attributes for a valid token. */
  readonly requiredAttributes?: readonly string[] | undefined;
  /** Attributes allowed during serialization. */
  readonly allowedAttributes?: readonly string[] | undefined;
}

/**
 * Creates a Tiptap-compatible atom block Markdown spec.
 *
 * @param options - Atom block options.
 * @returns Parser, tokenizer, and renderer for the atom block spec.
 */
export function createAtomBlockMarkdownSpec(options: AtomBlockMarkdownSpecOptions): {
  /** Parses a tokenizer token into JSON content. */
  parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) => MarkdownParseResult;
  /** Tokenizer consumed by marked-compatible Markdown managers. */
  markdownTokenizer: MarkdownTokenizer;
  /** Serializes JSON content to Markdown. */
  renderMarkdown: (node: QuireJSONContent) => string;
} {
  const blockName = options.name ?? options.nodeName;
  const parseAttributes = options.parseAttributes ?? defaultParseAttributes;
  const serializeAttributes = options.serializeAttributes ?? defaultSerializeAttributes;
  const defaultAttributes = options.defaultAttributes ?? {};
  const requiredAttributes = options.requiredAttributes ?? [];

  return {
    parseMarkdown: (token, helpers) =>
      helpers.createNode(
        options.nodeName,
        { ...defaultAttributes, ...(token.attributes ?? {}) },
        []
      ),
    markdownTokenizer: {
      name: options.nodeName,
      level: "block",
      start(source) {
        const index = source.match(new RegExp(`^:::${blockName}(?:\\s|$)`, "m"))?.index;

        return index ?? -1;
      },
      tokenize(source) {
        const match = source.match(
          new RegExp(`^:::${blockName}(?:\\s+\\{([^}]*)\\})?\\s*:::(?:\\n|$)`)
        );

        if (!match) {
          return undefined;
        }

        const attributes = parseAttributes(match[1] ?? "");
        const missingRequired = requiredAttributes.find(
          (attribute) => !Object.prototype.hasOwnProperty.call(attributes, attribute)
        );

        if (missingRequired) {
          return undefined;
        }

        return {
          type: options.nodeName,
          raw: match[0],
          attributes
        };
      }
    },
    renderMarkdown: (node) => {
      const attrs = serializeAttributes(filterAllowedAttributes(
        node.attrs ?? {},
        options.allowedAttributes
      ));
      const attrString = attrs ? ` {${attrs}}` : "";

      return `:::${blockName}${attrString} :::`;
    }
  };
}
