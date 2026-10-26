import { renderEditableMathML, renderMathML } from '@quirekit/math';
import type { MathDocument, MathFormulaLayout } from '@quirekit/math';
import { createFormulaEngine } from '../engine/layout';
import type { MathJaxRenderer, MathJaxRendererOptions, MathJaxRenderOptions } from './types';

/**
 * Creates a bounded, instance-owned MathJax layout service.
 * @param options - Explicit retained layout limits.
 * @returns Renderer without editor state, mounted DOM or global page scanning.
 */
export function createMathJaxRenderer(options: MathJaxRendererOptions = {}): MathJaxRenderer {
  const maxEntries = options.maxEntries ?? 64;
  const maxBytes = options.maxBytes ?? 4 * 1024 * 1024;
  const maxPending = options.maxPending ?? 128;
  if (![maxEntries, maxBytes, maxPending].every(value => Number.isSafeInteger(value) && value > 0)) throw new Error('Invalid math renderer cache limits');
  const layout = createFormulaEngine();
  const cache = new Map<string, { value: MathFormulaLayout; bytes: number }>();
  const pending = new Map<string, Promise<MathFormulaLayout>>();
  let tail = Promise.resolve();
  let disposed = false;
  let layouts = 0;
  let hits = 0;
  let bytes = 0;
  /**
   * Lays out one formula from its parsed source.
   * @param document - Matching exact source and structure.
   * @param renderOptions - Explicit layout dependencies.
   * @returns Atomic immutable layout, never a stale result from a disposed instance.
   */
  function render(document: MathDocument, renderOptions: MathJaxRenderOptions = {}): Promise<MathFormulaLayout> {
    const editable = renderOptions.editable === true;
    const markup = editable ? renderEditableMathML(document, { focus: { slot: 'root', index: 0 } }, false) : renderMathML(document, { display: renderOptions.display ?? 'inline' });
    return schedule(markup, document, editable);
  }
  /**
   * Lays out read-only MathML produced by a trusted converter, such as a Word formula drawn without editable source.
   * @param markup - Complete `<math>` markup.
   * @param label - Accessible description of the formula.
   * @returns Atomic immutable layout without editing slots.
   */
  function renderMarkup(markup: string, label: string): Promise<MathFormulaLayout> {
    return schedule(markup, label, false);
  }
  /**
   * Resolves repeated content once and serializes the stateful engine conversions.
   * @param markup - MathML to lay out.
   * @param document - Matching formula, or the accessible label of read-only markup.
   * @param editable - Whether to publish editing geometry.
   * @returns Atomic immutable layout, never a stale result from a disposed instance.
   */
  function schedule(markup: string, document: MathDocument | string, editable: boolean): Promise<MathFormulaLayout> {
    if (disposed) return Promise.reject(new Error('Math renderer is disposed'));
    // Presentation markup carries the source label; editable markup is independent of source spelling.
    const key = typeof document === 'string' ? `${markup}\u0000${document}` : markup;
    const cached = cache.get(key);
    if (cached) {
      hits++;
      cache.delete(key);
      cache.set(key, cached);
      return Promise.resolve(cached.value);
    }
    const existing = pending.get(key);
    if (existing) {
      hits++;
      return existing;
    }
    if (pending.size >= maxPending) return Promise.reject(new Error('Math renderer conversion queue is full'));
    const task = tail.then(async () => {
      // The queue entry ends when the task settles, before any caller continuation runs.
      try {
        if (disposed) throw new Error('Math renderer is disposed');
        layouts++;
        const value = await layout(markup, document, editable);
        if (disposed) throw new Error('Math renderer is disposed');
        retain(key, value);
        return value;
      } finally {
        pending.delete(key);
      }
    });
    pending.set(key, task);
    tail = task.then(() => undefined, () => undefined);
    return task;
  }
  /**
   * Retains one layout within the entry and byte budgets, evicting least recently used layouts.
   * @param key - Exact MathML identity.
   * @param value - Immutable layout.
   */
  function retain(key: string, value: MathFormulaLayout): void {
    const size = key.length * 2 + value.svg.length * 2 + value.slots.reduce((sum, slot) => sum + 256 + slot.children.length * 48 + slot.boundaries.length * 8, 0);
    if (size > maxBytes) return;
    cache.set(key, { value, bytes: size });
    bytes += size;
    while (cache.size > maxEntries || bytes > maxBytes) {
      const oldest = cache.keys().next().value!;
      bytes -= cache.get(oldest)!.bytes;
      cache.delete(oldest);
    }
  }
  /** Drops retained immutable layouts without changing current conversion ownership. */
  function clear(): void {
    cache.clear();
    bytes = 0;
  }
  /** Ends this instance's publishing lifetime and releases retained output. */
  function dispose(): void {
    disposed = true;
    clear();
  }
  /**
   * Reads work without subscribing to overlay or editor events.
   * @returns Current retained work snapshot.
   */
  function getStats() { return { layouts, hits, entries: cache.size, bytes, pending: pending.size }; }
  return { render, renderMarkup, getStats, clear, dispose };
}
