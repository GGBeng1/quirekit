import {
  DOMParser as PMDOMParser,
  Fragment,
  type Node as PMNode,
  type ParseOptions,
  Schema
} from "@quirekit/pm";
import type { QuireContent, QuireJSONContent } from "../types";
import { elementFromString } from "../utilities/elementFromString";

/** Options used while creating a ProseMirror node or fragment from content. */
export interface CreateNodeFromContentOptions {
  /** Whether string content should be parsed as a slice fragment. */
  readonly slice?: boolean;
  /** DOM parser options used for HTML content. */
  readonly parseOptions?: ParseOptions;
  /** Whether invalid content should throw instead of falling back to empty content. */
  readonly errorOnInvalidContent?: boolean;
}

/** Content accepted by static content helpers. */
export type QuireNodeContent = QuireContent | PMNode | Fragment;

/**
 * Creates a ProseMirror node or fragment from Tiptap-compatible content.
 *
 * @param content - HTML, JSON, node, fragment, or null content.
 * @param schema - Schema used to parse the content.
 * @param options - Parsing options.
 * @returns ProseMirror node or fragment.
 */
export function createNodeFromContent(
  content: QuireNodeContent,
  schema: Schema,
  options: CreateNodeFromContentOptions = {}
): PMNode | Fragment {
  const normalizedOptions: CreateNodeFromContentOptions = {
    slice: true,
    parseOptions: {},
    ...options
  };

  if (isProseMirrorNode(content) || content instanceof Fragment) {
    return content;
  }

  if (content === null) {
    return Fragment.empty;
  }

  if (Array.isArray(content) || typeof content === "object") {
    return createNodeFromJSONContent(content, schema, normalizedOptions);
  }

  if (typeof content === "string") {
    return createNodeFromStringContent(content, schema, normalizedOptions);
  }

  return Fragment.empty;
}

/**
 * Creates a ProseMirror node from JSON content.
 *
 * @param content - JSON content.
 * @param schema - Schema used to parse the content.
 * @param options - Parsing options.
 * @returns ProseMirror node.
 */
function createNodeFromJSONContent(
  content: QuireJSONContent | QuireJSONContent[],
  schema: Schema,
  options: CreateNodeFromContentOptions
): PMNode | Fragment {
  try {
    if (Array.isArray(content)) {
      const fragment = Fragment.fromArray(
        content.map((item) => schema.nodeFromJSON(item))
      );

      if (options.errorOnInvalidContent) {
        fragment.forEach((node) => node.check());
      }

      return fragment;
    }

    const node = schema.nodeFromJSON(content);

    if (options.errorOnInvalidContent) {
      node.check();
    }

    return node;
  } catch (error) {
    if (options.errorOnInvalidContent) {
      throw new Error("[quirekit error]: Invalid JSON content.", {
        cause: error as Error
      });
    }

    console.warn("[QuireKit] Invalid JSON content was ignored.", content, error);
    return Fragment.empty;
  }
}

/**
 * Creates a ProseMirror node or fragment from HTML content.
 *
 * @param content - HTML content.
 * @param schema - Schema used to parse the content.
 * @param options - Parsing options.
 * @returns ProseMirror node or fragment.
 */
function createNodeFromStringContent(
  content: string,
  schema: Schema,
  options: CreateNodeFromContentOptions
): PMNode | Fragment {
  if (content.trim().length === 0) {
    return options.slice ? Fragment.empty : schema.topNodeType.createAndFill() ?? schema.topNodeType.create();
  }

  if (options.errorOnInvalidContent) {
    assertValidHTMLContent(content, schema, options.parseOptions);
  }

  const parser = PMDOMParser.fromSchema(schema);
  const element = elementFromString(content);

  return options.slice
    ? parser.parseSlice(element, options.parseOptions).content
    : parser.parse(element, options.parseOptions);
}

/**
 * Detects elements that the active schema cannot parse.
 *
 * @param content - HTML content to validate.
 * @param schema - Active editor schema.
 * @param parseOptions - DOM parser options used by the real parse.
 */
function assertValidHTMLContent(
  content: string,
  schema: Schema,
  parseOptions: ParseOptions | undefined
): void {
  let invalidElement: Element | undefined;
  const validationSchema = new Schema({
    ...(schema.spec.topNode === undefined
      ? {}
      : { topNode: schema.spec.topNode }),
    marks: schema.spec.marks,
    nodes: schema.spec.nodes.append({
      quirekitInvalidContentBoundary: {
        group: "block",
        content: "inline*",
        parseDOM: [{
          tag: "*",
          getAttrs(element) {
            if (typeof element === "object" && "outerHTML" in element) {
              invalidElement = element as Element;
            }
            return null;
          }
        }]
      }
    })
  });
  const parser = PMDOMParser.fromSchema(validationSchema);
  const element = elementFromString(content);

  parser.parseSlice(element, parseOptions);

  if (invalidElement) {
    throw new Error("[quirekit error]: Invalid HTML content.", {
      cause: new Error(`Unsupported element: ${invalidElement.outerHTML}`)
    });
  }
}

/**
 * Checks whether a value looks like a ProseMirror node.
 *
 * @param value - Value to inspect.
 * @returns Whether the value is a ProseMirror node.
 */
function isProseMirrorNode(value: unknown): value is PMNode {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "object" &&
    value.type !== null &&
    "schema" in value.type
  );
}
