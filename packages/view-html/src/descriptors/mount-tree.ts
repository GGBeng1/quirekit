import type { HtmlDescriptor } from "./types";

/**
 * Appends one descriptor's own mounted DOM without promoting detached children.
 *
 * @param contentDOM - Parent DOM node that accepts retained children.
 * @param descriptor - Retained child to realize beneath the parent.
 */
export function appendMountedHtmlDescriptor(
  contentDOM: HTMLElement | null,
  descriptor: HtmlDescriptor
): void {
  if (!contentDOM) {
    return;
  }
  if (descriptor.mount) {
    contentDOM.appendChild(descriptor.mount.dom);
  }
}
