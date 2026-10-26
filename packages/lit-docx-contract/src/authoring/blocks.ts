import type { LitAstNode } from "../core/contracts.js";
import type {
  DocxBlocksApi,
  DocxParagraphOptions,
  DocxParagraphProperties
} from "./types.js";
import { createDocxRoundTripApi } from "./round-trip.js";
import { createDocxStylesApi } from "./styles.js";
import { createDocxTablesApi } from "./tables.js";

/**
 * Creates the semantic block operation family.
 *
 * @returns Immutable block builders.
 */
export function createDocxBlocksApi(): DocxBlocksApi {
  const roundTrip = createDocxRoundTripApi();
  const styles = createDocxStylesApi();
  const tables = createDocxTablesApi();
  const api: DocxBlocksApi = {
    paragraph: (options: DocxParagraphOptions = {}) => createParagraph(
      options.children ?? [],
      options.properties
    ),
    heading: (options) => Object.freeze({
      type: "heading",
      children: Object.freeze([...(options.children ?? [])]),
      attrs: Object.freeze({
        ...styles.paragraphProperties(options.properties ?? {}),
        level: options.level
      })
    }),
    blockquote: (options) => Object.freeze({
      type: "blockquote",
      children: Object.freeze([...options.children])
    }),
    codeBlock: (options) => Object.freeze({
      type: "codeBlock",
      children: Object.freeze([
        ...(options.children ?? [{
          type: "text",
          text: options.text ?? ""
        }])
      ]),
      attrs: Object.freeze({
        ...(options.language === undefined
          ? {}
          : { language: options.language }),
        ...(options.styleId === undefined ? {} : { styleId: options.styleId })
      })
    }),
    pageBreak: () => Object.freeze({ type: "pageBreak" }),
    taggedContainer: (options) => roundTrip.taggedBlock(options),
    callout: (options) => tables.singleCellContainer({
      children: options.children,
      shading: styles.shading({ fill: options.fill ?? "F2F4F7" }),
      ...(options.border === undefined ? {} : { border: options.border })
    })
  };
  return Object.freeze(api);
}

/**
 * Creates one immutable paragraph node.
 *
 * @param children - Inline children.
 * @param properties - Optional paragraph properties.
 * @returns Semantic paragraph.
 */
function createParagraph(
  children: readonly LitAstNode[],
  properties: DocxParagraphProperties | undefined
): LitAstNode {
  const styles = createDocxStylesApi();
  const attrs = properties === undefined
    ? undefined
    : styles.paragraphProperties(properties);
  return Object.freeze({
    type: "paragraph",
    children: Object.freeze([...children]),
    ...(attrs === undefined ? {} : { attrs })
  });
}
