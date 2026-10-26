import type { QuireDocumentRange } from "@quirekit/renderer";
import type { HtmlContainerDesc, HtmlDescriptor } from "../../descriptors";

/**
 * Walks one retained subtree without querying DOM structure.
 *
 * @param descriptor - Current retained descriptor.
 * @param visit - Callback receiving each descriptor once.
 */
export function walkHtmlDescriptors(
  descriptor: HtmlDescriptor,
  visit: (descriptor: HtmlDescriptor) => void
): void {
  visit(descriptor);
  if (isHtmlContainerDescriptor(descriptor)) {
    for (const child of descriptor.children) {
      walkHtmlDescriptors(child, visit);
    }
  }
}

/**
 * Returns a container's canonical child-content range.
 *
 * @param container - Retained container to inspect.
 * @returns Canonical content range.
 */
export function htmlDescriptorContentRange(
  container: HtmlContainerDesc
): QuireDocumentRange {
  return container.kind === "node" || container.kind === "node-view"
    ? { from: container.range.from + 1, to: container.range.to - 1 }
    : container.range;
}

/**
 * Narrows a retained descriptor to a child-owning container.
 *
 * @param descriptor - Descriptor to inspect.
 * @returns Whether the descriptor owns retained children.
 */
export function isHtmlContainerDescriptor(
  descriptor: HtmlDescriptor
): descriptor is HtmlContainerDesc {
  return descriptor.kind === "document" ||
    descriptor.kind === "node" ||
    descriptor.kind === "mark" ||
    descriptor.kind === "inline-decoration" ||
    descriptor.kind === "node-view";
}
