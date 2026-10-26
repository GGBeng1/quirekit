import { readWhiteboardLocale } from "../locale/resolve";
import type { App, Component } from "vue";
import type { WhiteboardActionsMount } from "@quirekit/whiteboard";
import { v4 as uuidv4 } from "uuid";

/** @param container - Host-owned active preview slot. @param initial - Exact source actions. @returns Disposable toolbar with no editor subscriptions. */
export const mountWhiteboardActions: WhiteboardActionsMount<HTMLElement> = (container, initial) => {
  let current = initial, alive = true, app: App | undefined;
  let update: (() => void) | undefined, observer: MutationObserver | undefined;
  const dark = container.closest<HTMLElement>("[data-qk-scheme]")?.dataset.qkScheme === "dark";
  void Promise.all([import("vue"), import("@quirekit/ui/vue"), import("../vue/actions.vue")]).then(([{ createApp, h, shallowRef }, { QuireLocaleProvider }, { default: WhiteboardActions }]) => {
    if (!alive) return;
    const actions = shallowRef(current); update = () => { actions.value = current; };
    const locale = shallowRef(readWhiteboardLocale(container));
    const languageRoot = container.closest("[lang]") ?? container.ownerDocument.documentElement;
    // Observe only this product's language attribute, never document edits.
    observer = new container.ownerDocument.defaultView!.MutationObserver(() => { locale.value = readWhiteboardLocale(container); });
    observer.observe(languageRoot, { attributes: true, attributeFilter: ["lang"] });
    app = createApp({ render: () => h(QuireLocaleProvider as Component, { locale: locale.value }, { default: () => h(WhiteboardActions, { actions: actions.value, ownerDocument: container.ownerDocument, dark }) }) });
    app.config.idPrefix = `whiteboard-actions-${uuidv4()}`;
    app.mount(container);
  }).catch(error => { if (alive) container.ownerDocument.defaultView?.reportError(error); });
  return {
    /** @param next - Fresh canonical facts for this active preview. */
    update(next) { current = next; update?.(); },
    /** Prevents a late import from remounting a released toolbar. */
    destroy() { if (!alive) return; alive = false; observer?.disconnect(); app?.unmount(); }
  };
};
