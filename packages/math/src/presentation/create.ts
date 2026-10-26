import type { MathDocument } from '../model/types';
import { freezeMathValue } from '../shared/freeze';
import type { MathPresentation, MathPresentationOptions, MathPresentationSnapshot } from './types';

/**
 * Coordinates current formula output independently of any UI framework.
 * @param options - Explicit backend and lifetime ownership.
 * @returns A subscribable presenter with latest-result correlation.
 */
export function createMathPresentation(options: MathPresentationOptions): MathPresentation {
  let state: MathPresentationSnapshot = Object.freeze({ ready: false, pending: false, layouts: 0 });
  const listeners = new Set<(snapshot: MathPresentationSnapshot) => void>();
  let desired: MathDocument | undefined;
  let rendered: MathDocument | undefined;
  let visible = true;
  let generation = 0;
  let running = false;
  let alive = true;
  let requests = 0;
  /**
   * Publishes changed facts once, keeping reads and redundant requests inert.
   * @param patch - Presentation changes for the current generation.
   */
  function publish(patch: Partial<MathPresentationSnapshot>): void {
    const next = { ...state, ...patch };
    if (Object.keys(next).every(key => next[key as keyof MathPresentationSnapshot] === state[key as keyof MathPresentationSnapshot])) return;
    state = Object.freeze(next);
    for (const listener of [...listeners]) listener(state);
  }
  /**
   * Serializes backend work while retaining synchronous input acceptance.
   * @returns Resolves when the latest visible request has settled.
   */
  async function present(): Promise<void> {
    if (running) return;
    running = true;
    while (alive && visible && desired && desired !== rendered) {
      const document = desired;
      const version = generation;
      requests++;
      publish({ pending: true });
      try {
        const layout = await options.renderer.render(document, { editable: options.editable === true });
        // Graphic and slots cross the same generation boundary; late output owns neither.
        if (alive && visible && version === generation) {
          rendered = document;
          publish({ layout: freezeMathValue(layout), ready: true, error: undefined });
        }
      } catch (cause) {
        if (alive && version === generation) {
          desired = undefined;
          publish({ ready: false, error: cause instanceof Error ? cause.message : 'Formula layout failed' });
        }
      } finally { if (alive) publish({ layouts: options.renderer.getStats?.().layouts ?? requests }); }
    }
    running = false;
    if (alive) publish({ pending: false });
  }
  return {
    /** @returns Retained immutable presentation facts without new work. */
    getSnapshot: () => state,
    /**
     * @param listener - Accepted fact listener.
     * @returns Idempotent unsubscribe.
     */
    subscribe(listener) {
      if (!alive) return () => {};
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    /**
     * @param document - Current admitted source.
     * @param shown - Consumer visibility.
     */
    update(document, shown = true) {
      if (!alive || desired === document && visible === shown) return;
      generation++;
      visible = shown;
      desired = document;
      publish({ ready: shown && rendered === document, pending: shown && rendered !== document, error: undefined });
      if (shown) void present();
    },
    /** Ends publishing and explicitly owned backend resources. */
    destroy() {
      if (!alive) return;
      alive = false;
      generation++;
      desired = undefined;
      listeners.clear();
      state = Object.freeze({ ...state, ready: false, pending: false });
      if (options.disposeRenderer) options.renderer.dispose?.();
    },
  };
}
