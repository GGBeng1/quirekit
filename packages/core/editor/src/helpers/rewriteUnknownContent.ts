import type { Schema } from "@quirekit/pm";
import type { QuireJSONContent } from "../types";

/** Options accepted by `rewriteUnknownContent`. */
export interface QuireRewriteUnknownContentOptions {
  /** Whether unknown nodes with content should become paragraphs. */
  readonly fallbackToParagraph?: boolean | undefined;
}

/** Record describing unsupported content that was removed or rewritten. */
export interface QuireRewrittenContent {
  /** Original JSON content or mark that was rewritten. */
  readonly original: QuireJSONContent | { readonly type: string; readonly [key: string]: unknown };
  /** Unsupported node or mark type name. */
  readonly unsupported: string;
}

/** Result returned by `rewriteUnknownContent`. */
export interface QuireRewriteUnknownContentResult {
  /** Cleaned JSON content, or null when the root was unsupported and removed. */
  readonly json: QuireJSONContent | null;
  /** Unsupported nodes and marks encountered while rewriting. */
  readonly rewrittenContent: readonly QuireRewrittenContent[];
}

/**
 * Removes unknown marks and rewrites or removes unknown nodes in JSON content.
 *
 * @param json - JSON content to inspect.
 * @param schema - Schema that defines supported node and mark names.
 * @param options - Rewrite options.
 * @returns Cleaned JSON plus unsupported content records.
 */
export function rewriteUnknownContent(
  json: QuireJSONContent,
  schema: Schema,
  options: QuireRewriteUnknownContentOptions = {}
): QuireRewriteUnknownContentResult {
  const rewrittenContent: QuireRewrittenContent[] = [];
  const result = rewriteUnknownContentInner({
    json: cloneJSONContent(json),
    validMarks: new Set(Object.keys(schema.marks)),
    validNodes: new Set(Object.keys(schema.nodes)),
    options,
    rewrittenContent
  });

  return {
    json: result,
    rewrittenContent
  };
}

/**
 * Recursively rewrites one JSON content node.
 *
 * @param config - Rewrite state.
 * @returns Rewritten JSON content, or null when omitted.
 */
function rewriteUnknownContentInner(config: {
  readonly json: QuireJSONContent;
  readonly validMarks: ReadonlySet<string>;
  readonly validNodes: ReadonlySet<string>;
  readonly options: QuireRewriteUnknownContentOptions;
  readonly rewrittenContent: QuireRewrittenContent[];
}): QuireJSONContent | null {
  const { validMarks, validNodes, options, rewrittenContent } = config;
  const json = { ...config.json };

  if (Array.isArray(json.marks)) {
    json.marks = json.marks.filter((mark) => {
      const name = mark.type;

      if (validMarks.has(name)) {
        return true;
      }

      rewrittenContent.push({
        original: cloneJSONContent(mark as QuireJSONContent),
        unsupported: name
      });

      return false;
    });
  }

  if (Array.isArray(json.content)) {
    json.content = json.content
      .map((value) =>
        rewriteUnknownContentInner({
          json: value,
          validMarks,
          validNodes,
          options,
          rewrittenContent
        })
      )
      .filter((value): value is QuireJSONContent => value !== null);
  }

  if (json.type && !validNodes.has(json.type)) {
    rewrittenContent.push({
      original: cloneJSONContent(json),
      unsupported: json.type
    });

    if (Array.isArray(json.content) && options.fallbackToParagraph !== false) {
      return {
        ...json,
        type: "paragraph"
      };
    }

    return null;
  }

  return json;
}

/**
 * Creates a JSON-safe copy of a content object.
 *
 * @param value - JSON-like value to clone.
 * @returns Cloned JSON content.
 */
function cloneJSONContent<T extends QuireJSONContent>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
