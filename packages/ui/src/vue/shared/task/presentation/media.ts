import { shallowRef } from "vue";
import type { QuireKitResolvedTaskPresentation } from "../../../../components/task/types";
import type { TaskPresentationMedia, TaskPresentationMediaEntry } from "./types";

const registry = new WeakMap<Document, TaskPresentationMediaEntry>();
const desktopQuery = "(min-width: 768px)";

/**
 * Acquires layout media from the trigger's window, never the ambient global window.
 * @param owner - Document whose layout viewport chooses the next task shell.
 * @returns A shared subscription lease, or undefined without a browsing context.
 */
export function subscribeTaskPresentationMedia(owner: Document): TaskPresentationMedia | undefined {
  const view = owner.defaultView;
  if (!view?.matchMedia) return undefined;
  let entry = registry.get(owner);
  if (!entry) {
    const query = view.matchMedia(desktopQuery);
    const value = shallowRef<QuireKitResolvedTaskPresentation>(query.matches ? "desktop" : "bottom");
    /** Publishes the current layout viewport after a browser media change. */
    const onChange = () => { value.value = query.matches ? "desktop" : "bottom"; };
    entry = { query, value, onChange, consumers: 0 };
    registry.set(owner, entry);
    query.addEventListener("change", onChange);
  }
  const shared = entry;
  shared.consumers += 1;
  let released = false;
  return {
    value: shared.value,
    /** @returns Current media result, including changes whose notification is still queued. */
    refresh() {
      if (!released) shared.onChange();
      return shared.value.value;
    },
    /** Removes the document listener only after its final live lease has ended. */
    release() {
      if (released) return;
      released = true;
      shared.consumers -= 1;
      if (shared.consumers !== 0) return;
      shared.query.removeEventListener("change", shared.onChange);
      registry.delete(owner);
    }
  };
}

/**
 * Finds the original event's document without realm-specific instanceof checks.
 * @param event - Trigger event, possibly originating inside another document.
 * @returns Its browsing document when one is available.
 */
export function getTaskEventDocument(event: Event): Document | undefined {
  for (const target of [event.target, event.currentTarget]) {
    if (!target) continue;
    if ("ownerDocument" in target) return (target as Node).ownerDocument ?? undefined;
    if ("nodeType" in target && target.nodeType === 9) return target as Document;
    if ("document" in target) return (target as Window).document;
  }
  return "view" in event ? (event as UIEvent).view?.document : undefined;
}
