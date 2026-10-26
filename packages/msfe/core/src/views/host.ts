import type { MsfeComponentEntry, MsfeComponentHost, MsfeNodeViewRenderer } from "./types";
import type { ComponentViewEntry } from "./component/types";

/** @param framework - Consumer framework. @returns Isolated portal store for one editor. */
export function createComponentHost(framework: MsfeComponentHost["framework"]): MsfeComponentHost {
  let snapshot: readonly MsfeComponentEntry[] = [];
  let views: readonly ComponentViewEntry[] = [];
  let disposed = false;
  const listeners = new Set<() => void>();
  /** Publishes one store change after an entry change, never for source position alone. */
  function notify(): void { for (const listener of [...listeners]) listener(); }
  return {
    framework,
    getViewSnapshot: () => views,
    publishView(entry) {
      if (disposed) return;
      views = views.some(item => item.id === entry.id) ? views.map(item => item.id === entry.id ? entry : item) : [...views, entry];
      notify();
    },
    removeView(id) { if (views.some(entry => entry.id === id)) { views = views.filter(entry => entry.id !== id); notify(); } },
    getSnapshot: () => snapshot,
    subscribe(listener) { if (!disposed) listeners.add(listener); return () => { listeners.delete(listener); }; },
    publish(entry) {
      if (disposed) return;
      const previous = snapshot.findIndex(item => item.id === entry.id);
      snapshot = previous < 0 ? [...snapshot, entry] : snapshot.map((item, index) => index === previous ? entry : item);
      notify();
    },
    remove(id) {
      if (!snapshot.some(entry => entry.id === id)) return;
      snapshot = snapshot.filter(entry => entry.id !== id); notify();
    },
    destroy() { if (disposed) return; disposed = true; snapshot = []; views = []; notify(); listeners.clear(); },
  };
}

/** @param framework - Expected host. @param component - Framework definition. @returns Shared portal renderer. */
export function componentRenderer(framework: MsfeComponentHost["framework"], component: unknown): MsfeNodeViewRenderer {
  return ({ dom, props, host }) => {
    if (host?.framework !== framework) throw new Error(`node-view-host-required: ${framework}`);
    const id = props.id;
    host.publish({ id, dom, props, component });
    return { update(next) { host.publish({ id, dom, props: next, component }); }, destroy() { host.remove(id); } };
  };
}
