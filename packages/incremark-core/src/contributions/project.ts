import type { SyntaxNode } from "@lezer/common";
import { sourceDocument, sourceNode } from "@quirekit/msfe-core";
import { blockChildren } from "../reading/blocks";
import { inlineChildren } from "../reading/inline";
import type { ReadingContext } from "../reading/types";

/** @param context - Accepted source and output-family index. @param node - Visited syntax. @returns Owned content or undefined for built-in fallback. */
export function renderContribution<Output>(context: ReadingContext<Output>, node: SyntaxNode): Output | undefined {
  for (const contribution of context.contributions.get(node.name) ?? []) {
    let attrs: object | null;
    try { attrs = contribution.codec.read(context.state, node); }
    catch (cause) {
      context.report({ owner: contribution.owner, phase: "read", from: node.from, to: node.to, cause });
      return context.adapter.fallback(context.state.sliceDoc(node.from, node.to));
    }
    if (attrs === null) continue;
    return context.adapter.contribution({ contribution, report: context.report,
      source: () => context.state.sliceDoc(node.from, node.to),
      context: {
        name: contribution.owner, attrs: Object.freeze({ ...attrs }), node: sourceNode(node),
        document: sourceDocument(context.state), locale: context.locale,
        /** @param from - Inclusive content start. @param to - Exclusive content end. @returns Whole, source-bounded inline children. */
        renderInline(from = node.from, to = node.to) {
          if (!Number.isInteger(from) || !Number.isInteger(to) || from < node.from || to > node.to || to < from) throw new RangeError("reading-content-outside-node");
          // Child presentation owns its whole range. Reject slicing through it so
          // recursive adapters cannot emit source outside the caller's accepted slice.
          for (let child = node.firstChild; child; child = child.nextSibling) {
            if (child.to > from && child.from < to && (child.from < from || child.to > to)) throw new RangeError("reading-content-splits-child");
          }
          return inlineChildren(context, node, from, to);
        },
        /** @param omitted - Non-content markers owned by this node. @returns Its remaining direct blocks. */
        renderBlocks: (omitted?: readonly string[]) => blockChildren(context, node, omitted),
      },
    });
  }
  return undefined;
}
