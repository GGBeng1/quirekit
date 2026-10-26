import type { SyntaxNode } from "@lezer/common";
import { h, type VNodeChild } from "vue";
import type { MarkdownRenderContext } from "@quirekit/incremark/vue";
import { highlightContainerName, parseHighlightAttributes } from "../highlight/attributes";
import HighlightBlock from "../vue/highlight/block.vue";

/** @param context - Accepted immutable reading inputs. @param node - Candidate container. @returns Highlight presentation, or undefined so other containers keep the shared renderer. */
export function renderHighlight(context: MarkdownRenderContext, node: SyntaxNode): VNodeChild | undefined {
  const name = node.getChild("ContainerName"), title = node.getChild("ContainerTitle");
  if (!name || node.getChildren("ContainerMark").length !== 2 || context.state.sliceDoc(name.from, name.to) !== highlightContainerName) return undefined;
  const attributes = parseHighlightAttributes(title ? context.state.sliceDoc(title.from, title.to) : "");
  const children: VNodeChild[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (!["ContainerMark", "ContainerName", "ContainerTitle"].includes(child.name)) children.push(context.render(child) as VNodeChild);
  }
  return h(HighlightBlock, { emoji: attributes.emoji, color: attributes.color, text: attributes.text }, { default: () => children });
}
