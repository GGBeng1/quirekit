import { renderDataViewPreview } from "./data-view";
import type { SyntaxNode } from "@lezer/common";
import type { VNodeChild } from "vue";
import { readCodeBody, type MarkdownRenderContext } from "@quirekit/incremark/vue";
import { renderMindMapPreview } from "./mind-map";
import { renderFlowchartPreview } from "./flowchart";
import { renderWhiteboardPreview } from "./whiteboard";
import { renderHighlight } from "./highlight";

/** @param context - Accepted immutable reading inputs. @param node - Candidate source node.
 * @returns Highlight containers and saved product previews after a complete root fence; ordinary Markdown stays public-package owned. */
export function renderProductNode(context: MarkdownRenderContext, node: SyntaxNode): VNodeChild | undefined {
  if (node.name === "CustomContainer") return renderHighlight(context, node);
  if (node.name !== "FencedCode" || node.parent?.name !== "Document" || node.getChildren("CodeMark").length !== 2) return undefined;
  const info = node.getChild("CodeInfo"), language = info ? context.state.sliceDoc(info.from, info.to).trim() : "";
  if (language === "quirekit-data-view") return renderDataViewPreview(readCodeBody(context.state, node));
  if (language === "quirekit-mind-map") return renderMindMapPreview(readCodeBody(context.state, node));
  if (language === "quirekit-flowchart") return renderFlowchartPreview(readCodeBody(context.state, node));
  if (language === "quirekit-whiteboard") return renderWhiteboardPreview(readCodeBody(context.state, node));
  return undefined;
}
