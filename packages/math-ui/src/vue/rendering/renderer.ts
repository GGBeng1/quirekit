import { createMathJaxRenderer } from '@quirekit/math-mathjax';
import type { MathJaxRenderer } from '@quirekit/math-mathjax';
import type { FormulaRendererLease } from './types';

let previews: MathJaxRenderer | undefined;
let owners = 0;

/**
 * Acquires a renderer only when a mounted consumer needs its first presentation.
 * @param editable - Editors own an isolated service; galleries share bounded output.
 * @returns An idempotently released lifetime, without page scanning or font listeners.
 */
export function acquireFormulaRenderer(editable: boolean): FormulaRendererLease {
  const renderer = editable ? createMathJaxRenderer({ maxPending: 1 })
    : previews ??= createMathJaxRenderer({ maxEntries: 128, maxBytes: 8 * 1024 * 1024, maxPending: 256 });
  if (!editable) owners++;
  let released = false;
  /** Ends this mounted consumer's publishing and retention ownership. */
  function release(): void {
    if (released) return;
    released = true;
    if (editable) renderer.dispose();
    else if (!--owners) {
      renderer.dispose();
      previews = undefined;
    }
  }
  return { renderer, release };
}
