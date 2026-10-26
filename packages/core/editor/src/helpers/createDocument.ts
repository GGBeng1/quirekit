import { Fragment, type Node as PMNode, type ParseOptions, type Schema } from "@quirekit/pm";
import {
  createNodeFromContent,
  type QuireNodeContent
} from "./createNodeFromContent";

/** Options used while creating a document from content. */
export interface CreateDocumentOptions {
  /** Whether invalid content should throw instead of falling back. */
  readonly errorOnInvalidContent?: boolean;
}

/**
 * Creates a ProseMirror document node from Tiptap-compatible content.
 *
 * @param content - HTML, JSON, node, or fragment content.
 * @param schema - Schema used to parse the content.
 * @param parseOptions - DOM parser options for HTML content.
 * @param options - Content validation options.
 * @returns ProseMirror document node.
 */
export function createDocument(
  content: QuireNodeContent,
  schema: Schema,
  parseOptions: ParseOptions = {},
  options: CreateDocumentOptions = {}
): PMNode {
  const nodeOrFragment = createNodeFromContent(content, schema, {
    slice: false,
    parseOptions,
    ...(options.errorOnInvalidContent === undefined
      ? {}
      : { errorOnInvalidContent: options.errorOnInvalidContent })
  });

  return nodeOrFragment instanceof Fragment
    ? schema.topNodeType.create(null, nodeOrFragment)
    : nodeOrFragment;
}
