import type { MarkdownExtension } from "@quirekit/lezer-markdown";
import { cloneValue } from "../../authoring/options";
import { sourceDocument, sourceNode } from "./adapter";
import type { Attributes, InlineSyntax, SourceDefinition, SourceSpec } from "./types";
import type { SourceCodec } from "../semantics/types";

/** @param definition - Typed source contract. @returns Installable source definition. */
export function defineSource<Attrs extends object, Resource = unknown>(definition: SourceDefinition<Attrs, Resource>): SourceSpec {
  return definition as unknown as SourceSpec;
}

/** @param syntax - Literal inline delimiters. @returns Default-parser adapter for this source rule. */
export function inlineSyntax(syntax: InlineSyntax): MarkdownExtension {
  const { name, open, close } = syntax;
  if (!/^[A-Za-z][\w]*$/u.test(name) || !open || !close || /[\r\n]/u.test(open + close)) throw new Error("invalid-inline-syntax");
  return { defineNodes: [name], parseInline: [{ name, before: "Link", parse(context, next, position) {
    if (next !== open.charCodeAt(0) || context.slice(position, position + open.length) !== open) return -1;
    // This helper owns a single line and never guesses nested or partially typed syntax.
    let end = position + open.length;
    for (; end < context.end; end++) {
      if (context.char(end) === 10) return -1;
      if (context.slice(end, end + close.length) === close) break;
      if (context.slice(end, end + open.length) === open || context.char(end) === 92) return -1;
    }
    if (end === position + open.length || end >= context.end) return -1;
    return context.addElement(context.elt(name, position, end + close.length));
  } }] };
}

/**
 * Compiles source semantics independently of any renderer or mounted viewport.
 * @param source - Source-only codec.
 * @param attributes - Optional persisted field declarations.
 * @returns Backend runtime codec using the same mapping, history and resource lifetimes.
 */
export function compileSource(source: SourceSpec, attributes?: Attributes): SourceCodec {
  const fingerprint = source.source;
  return { nodes: source.nodes,
    read(state, node) {
      const decoded = source.read(sourceDocument(state), sourceNode(node));
      if (decoded === null) return null;
      const result = { ...decoded } as Record<string, unknown>;
      for (const [name, attribute] of Object.entries(attributes ?? {})) {
        if (result[name] === undefined) result[name] = cloneValue(attribute.default);
        if (attribute.validate && !attribute.validate(result[name])) return null;
      }
      return result;
    },
    patch(state, node, patch) {
      if (attributes && Object.entries(patch).some(([name, value]) => !Object.hasOwn(attributes, name)
        || (attributes[name]!.validate && !attributes[name]!.validate!(value)))) return null;
      const edits = source.patch(sourceDocument(state), sourceNode(node), patch);
      if (edits === null) return null;
      const changes = Array.isArray(edits) ? edits : [edits];
      // A view's attributes only own its confirmed node range, including an insertion at either boundary.
      if (changes.some(edit => !Number.isInteger(edit.from) || !Number.isInteger(edit.to ?? edit.from)
        || edit.from < node.from || (edit.to ?? edit.from) < edit.from || (edit.to ?? edit.from) > node.to)) return null;
      return edits;
    },
    ...(fingerprint ? { source: (state, node) => fingerprint(sourceDocument(state), sourceNode(node)) } : {}),
  };
}
