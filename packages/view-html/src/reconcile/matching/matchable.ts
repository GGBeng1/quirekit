import type { HtmlContainerDesc, HtmlDescriptor } from "../../descriptors";
import type { HtmlTargetDescriptor } from "../types";
import { hasCompatibleHtmlShellTopology } from "./shell";

/**
 * Checks kind, type, and patchable markup compatibility without text equality.
 *
 * @param descriptor - Existing retained descriptor.
 * @param target - Desired next-document child.
 * @returns Whether the existing identity may represent the target.
 */
export function isHtmlDescriptorCompatible(
  descriptor: HtmlDescriptor,
  target: HtmlTargetDescriptor
): boolean {
  return descriptor.dirtyState !== "invalid" &&
    isHtmlDescriptorShapeCompatible(descriptor, target);
}

/**
 * Checks descriptor kind, schema type, markup, and rendered shell topology.
 *
 * @param descriptor - Existing retained descriptor.
 * @param target - Desired next-document child.
 * @returns Whether the descriptor shape may represent the target.
 */
function isHtmlDescriptorShapeCompatible(
  descriptor: HtmlDescriptor,
  target: HtmlTargetDescriptor
): boolean {
  if (descriptor.kind !== target.kind) {
    return false;
  }
  if (descriptor.kind === "widget") {
    return target.widgetKey !== undefined && descriptor.key === target.widgetKey;
  }
  if (descriptor.kind === "node") {
    const markupCompatible = descriptor.node.sameMarkup(target.node) || (
      descriptor.node.type === target.node.type &&
      descriptor.node.marks.length === target.node.marks.length &&
      descriptor.node.marks.every((mark, index) => mark.eq(target.node.marks[index]!))
    );

    return markupCompatible && hasCompatibleHtmlShellTopology(
      descriptor.mount,
      target.candidateMount
    );
  }
  if (descriptor.kind === "node-view") {
    return descriptor.host !== null &&
      descriptor.factory === target.nodeViewFactory &&
      descriptor.host.canRepresent(target.node);
  }
  if (descriptor.kind === "text") {
    return target.node.isText && descriptor.node.sameMarkup(target.node);
  }
  if (descriptor.kind === "inline-decoration") return JSON.stringify(descriptor.attrs) === JSON.stringify(target.inlineAttrs);
  if (descriptor.kind === "mark") {
    if (descriptor.factory || target.markViewFactory) {
      return descriptor.host !== null &&
        descriptor.factory === target.markViewFactory &&
        target.mark !== undefined &&
        descriptor.mark.eq(target.mark);
    }
    const markupCompatible = target.mark !== undefined && (
      descriptor.mark.eq(target.mark) || descriptor.mark.type === target.mark.type
    );

    return markupCompatible && hasCompatibleHtmlShellTopology(
      descriptor.mount,
      target.candidateMount
    );
  }
  return false;
}

/**
 * Checks whether a valid descriptor may be reused by structural heuristics.
 *
 * @param parent - Parent bounding the matching operation.
 * @param descriptor - Existing retained descriptor.
 * @param target - Desired next-document child.
 * @param blockedSourceIds - Duplicate explicit target claims.
 * @returns Whether structural ownership and shell compatibility both hold.
 */
export function isHtmlStructuralMatchCompatible(
  parent: HtmlContainerDesc,
  descriptor: HtmlDescriptor,
  target: HtmlTargetDescriptor,
  blockedSourceIds: ReadonlySet<string>
): boolean {
  if (
    descriptor.dirtyState === "invalid" ||
    blockedSourceIds.has(target.source.sourceId) ||
    descriptor.source.sourceId !== parent.source.sourceId ||
    target.source.sourceId !== parent.source.sourceId
  ) {
    return false;
  }
  if (descriptor.kind === "widget") {
    return descriptor.key === target.widgetKey;
  }
  return isHtmlDescriptorCompatible(descriptor, target);
}

/**
 * Checks exact explicit-source authority, including mapped-invalid moves.
 *
 * @param parent - Parent bounding the matching operation.
 * @param descriptor - Uniquely source-owned retained descriptor.
 * @param target - Desired source-owned child.
 * @param blockedSourceIds - Duplicate explicit target claims.
 * @returns Whether exact source, type, and shell authority permit retention.
 */
export function isHtmlExplicitSourceMatchCompatible(
  parent: HtmlContainerDesc,
  descriptor: HtmlDescriptor,
  target: HtmlTargetDescriptor,
  blockedSourceIds: ReadonlySet<string>
): boolean {
  const sourceId = target.source.sourceId;

  return sourceId !== parent.source.sourceId &&
    !blockedSourceIds.has(sourceId) &&
    descriptor.source.sourceId === sourceId &&
    isHtmlDescriptorShapeCompatible(descriptor, target);
}

/**
 * Checks unchanged mapped-tail identity without requiring text equality globally.
 *
 * @param descriptor - Existing tail descriptor.
 * @param target - Desired tail descriptor.
 * @returns Whether exact mapping or canonical content proves tail ownership.
 */
export function isHtmlUnchangedTail(
  parent: HtmlContainerDesc,
  descriptor: HtmlDescriptor,
  target: HtmlTargetDescriptor,
  blockedSourceIds: ReadonlySet<string>
): boolean {
  if (!isHtmlStructuralMatchCompatible(parent, descriptor, target, blockedSourceIds)) {
    return false;
  }
  if (
    descriptor.range.from === target.range.from &&
    descriptor.range.to === target.range.to
  ) {
    return true;
  }
  if (
    descriptor.kind === "node" ||
    descriptor.kind === "node-view" ||
    descriptor.kind === "text"
  ) {
    return descriptor.node.eq(target.node);
  }
  return descriptor.kind === "mark" &&
    target.mark !== undefined &&
    descriptor.mark.eq(target.mark) &&
    descriptor.children.some((child) => (
      child.kind === "text" && child.node.eq(target.node)
    ));
}
