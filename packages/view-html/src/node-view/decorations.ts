import { DecorationSet, type Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type { HtmlContainerDesc } from "../descriptors";
import { htmlDescriptorContentRange } from "../reconcile/ownership/descriptor-tree";
import {
  findHtmlDecorationNodeContainer,
  resolveHtmlContainerDecorationSource
} from "./decoration-source";
import type {
  HtmlNodeViewDecorationState,
  HtmlNodeViewEnvironment
} from "./types";

/**
 * Resolves live, node-local decorations for one retained child node.
 *
 * @param environment - Exact factory and decoration environment.
 * @param parent - Retained PM-node parent that owns the child offset.
 * @param node - Child node receiving outer and inner decorations.
 * @param range - Current mapped outer child range.
 * @returns Parent-local outer decorations and child-local inner source.
 */
export function resolveHtmlNodeViewDecorations(
  environment: HtmlNodeViewEnvironment | undefined,
  parent: HtmlContainerDesc | null,
  node: ProseMirrorNode,
  range: QuireDocumentRange
): HtmlNodeViewDecorationState {
  if (!environment || !parent) {
    return {
      decorations: [],
      innerDecorations: DecorationSet.empty
    };
  }
  const decorationParent = findHtmlDecorationNodeContainer(parent);
  const source = resolveHtmlContainerDecorationSource(environment, decorationParent);
  const offset = range.from - htmlDescriptorContentRange(decorationParent).from;
  const end = offset + node.nodeSize;
  const decorations = source.locals(decorationParent.node).filter((decoration) => (
    !decoration.widget &&
    decoration.from <= offset &&
    decoration.to >= end &&
    (!node.isInline || node.isLeaf || !decoration.inline)
  ));

  return {
    decorations,
    innerDecorations: source.forChild(offset, node)
  };
}
