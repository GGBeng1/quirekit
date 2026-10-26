import {
  createHtmlNodeDescriptor,
  type HtmlContainerDesc,
  type HtmlDescriptor
} from "../../descriptors";
import { createHtmlTextOrMarkDescriptor } from "../../descriptors/text";
import type { HtmlTargetDescriptor } from "../types";
import type { HtmlTargetCreationContext } from "./types";
import { createHtmlWidgetTargetDescriptor } from "../../node-view/widgets";

/**
 * Creates one unmatched target subtree with document-owned monotonic ids.
 *
 * @param parent - Retained parent that will adopt the new descriptor.
 * @param target - Desired child product.
 * @param context - Shared creation and diagnostic state.
 * @returns Newly created descriptor subtree.
 */
export function createHtmlTargetDescriptor(
  parent: HtmlContainerDesc,
  target: HtmlTargetDescriptor,
  context: HtmlTargetCreationContext
): HtmlDescriptor {
  const id = context.allocateId();

  if (target.kind === "widget") {
    if (!context.nodeViewEnvironment) {
      throw new RangeError("Keyed HTML widget targets require a NodeView environment.");
    }
    return createHtmlWidgetTargetDescriptor(
      parent,
      target,
      context.nodeViewEnvironment,
      id,
      context.diagnostics
    );
  }
  if (target.kind === "node" || target.kind === "node-view") {
    const created = createHtmlNodeDescriptor({
      id,
      node: target.node,
      parent,
      source: target.source,
      range: target.range,
      ownerDocument: context.ownerDocument,
      allocateId: context.allocateId,
      resolveSource: context.resolveSource,
      nodeViewEnvironment: context.nodeViewEnvironment
    });

    context.diagnostics.push(...created.diagnostics);
    return created.descriptor;
  }
  return createHtmlTextOrMarkDescriptor({
    id,
    node: target.node,
    parent,
    source: target.source,
    range: target.range,
    inlineAttrs: target.inlineAttrs,
    markIndex: target.markIndex,
    ownerDocument: context.ownerDocument,
    diagnostics: context.diagnostics,
    allocateId: context.allocateId,
    nodeViewEnvironment: context.nodeViewEnvironment
  });
}
