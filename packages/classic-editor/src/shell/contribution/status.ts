import type {
  ClassicEditorMountedRenderable,
  ClassicEditorRenderContext,
  ClassicEditorStatusItemContribution
} from "../../types";
import { appendRenderedValue, isMountedRenderable } from "./utils";

/** One mounted status item kept across shell refreshes. */
interface RetainedClassicEditorStatusItem {
  /** Product-owned wrapper inside the status bar. */
  readonly element: HTMLElement;
  /** Extension-owned mounted content lifecycle. */
  readonly controller: ClassicEditorMountedRenderable;
}

/** Mounted status items by status bar host, then by contribution id. */
const retainedStatusItems = new WeakMap<HTMLElement, Map<string, RetainedClassicEditorStatusItem>>();

/**
 * Renders current status contributions.
 *
 * Plain values are rebuilt on every refresh. Mounted values keep their wrapper
 * and only receive `update`, so framework-backed controls keep focus and state;
 * they are destroyed when their contribution is no longer visible.
 *
 * @param host - Status bar host.
 * @param items - Status contributions.
 * @param context - Mounted product context.
 */
export function renderStatus(
  host: HTMLElement,
  items: readonly ClassicEditorStatusItemContribution[],
  context: ClassicEditorRenderContext
): void {
  const previous = retainedStatusItems.get(host) ?? new Map<string, RetainedClassicEditorStatusItem>();
  const retained = new Map<string, RetainedClassicEditorStatusItem>();
  const children: HTMLElement[] = [];
  for (const item of items) {
    const kept = previous.get(item.id);
    if (kept !== undefined) {
      kept.controller.update?.(context);
      retained.set(item.id, kept);
      children.push(kept.element);
      continue;
    }
    const element = context.ownerDocument.createElement("span");
    element.className = "qk-classic-editor__status-item";
    element.dataset.statusId = item.id;
    const value = item.render(context);
    appendRenderedValue(element, value);
    if (isMountedRenderable(value)) retained.set(item.id, { element, controller: value });
    children.push(element);
  }
  for (const [id, kept] of previous) {
    if (!retained.has(id)) kept.controller.destroy();
  }
  retainedStatusItems.set(host, retained);
  host.replaceChildren(...children);
}

/**
 * Releases mounted status items before shell teardown.
 *
 * @param host - Status bar host.
 */
export function destroyRenderedStatus(host: HTMLElement): void {
  for (const kept of retainedStatusItems.get(host)?.values() ?? []) kept.controller.destroy();
  retainedStatusItems.delete(host);
  host.replaceChildren();
}
