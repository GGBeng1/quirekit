import type { ClassicEditorPopmenuListenerOptions, ClassicEditorPopmenuListeners } from "./types";

/**
 * Creates one framework-neutral product popmenu listener lifecycle.
 *
 * @param options - Semantic open and anchor invalidation callbacks.
 * @returns Reconciliation and destruction methods.
 */
export function createClassicEditorPopmenuListeners(
  options: ClassicEditorPopmenuListenerOptions
): ClassicEditorPopmenuListeners {
  const listenerMap = new Map<string, EventListener>();
  let listenerRoot: HTMLElement | undefined;
  let dismissDocument: Document | undefined;

  /**
   * Invalidates client coordinates only when their owning document region moves.
   * Menu scrolling belongs to public UI; sibling editors do not move this target.
   * @param event - Scroll captured by the existing owner-document listener.
   */
  function invalidateScrolledAnchor(event: Event): void {
    const root = listenerRoot;
    const ownerDocument = dismissDocument;
    if (root === undefined || ownerDocument === undefined) return;
    const target = event.target;
    if (target === ownerDocument || target === ownerDocument.body
      || target === ownerDocument.documentElement || target === ownerDocument.defaultView) {
      options.close();
      return;
    }
    const ElementConstructor = ownerDocument.defaultView?.Element;
    if (ElementConstructor === undefined || !(target instanceof ElementConstructor)) return;
    if (target.closest('[role="menu"]') !== null) return;
    const targetRoot = target.closest(".qk-classic-editor");
    if (targetRoot !== null && targetRoot !== root && root.contains(targetRoot)) return;
    if (root.contains(target) || target.contains(root)) options.close();
  }

  /** Removes listeners owned by the previous product root. */
  function clearRoot(): void {
    for (const [eventType, listener] of listenerMap) {
      listenerRoot?.removeEventListener(eventType, listener);
    }
    listenerMap.clear();
    listenerRoot = undefined;
  }

  /** Removes dismissal listeners owned by the previous document. */
  function clearDocument(): void {
    if (dismissDocument === undefined) return;
    dismissDocument.removeEventListener("scroll", invalidateScrolledAnchor, true);
    dismissDocument.defaultView?.removeEventListener("blur", options.close);
    dismissDocument = undefined;
  }

  return {
    updateRoot(root, contributions) {
      clearRoot();
      listenerRoot = root;
      if (root === undefined) return;
      for (const eventType of new Set(contributions.map((item) => item.eventType))) {
        const listener: EventListener = (event) => options.open(eventType, event);
        root.addEventListener(eventType, listener);
        listenerMap.set(eventType, listener);
      }
    },
    updateDocument(ownerDocument) {
      clearDocument();
      dismissDocument = ownerDocument;
      if (ownerDocument === undefined) return;
      ownerDocument.addEventListener("scroll", invalidateScrolledAnchor, true);
      ownerDocument.defaultView?.addEventListener("blur", options.close);
    },
    destroy() {
      clearRoot();
      clearDocument();
    }
  };
}
