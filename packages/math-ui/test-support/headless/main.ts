import { createMathEditor } from '@quirekit/math';
import { createMathJaxRenderer } from '@quirekit/math-mathjax';
import { createStandaloneMathView } from './view';
import type { StandaloneMathInstance } from './types';

export { bindMathEditor } from '@quirekit/math/browser';

const instances = new Map<string, StandaloneMathInstance>();
for (const host of document.querySelectorAll<HTMLElement>('[data-editor]')) {
  const editor = createMathEditor({ latex: host.dataset.source ?? '', renderer: createMathJaxRenderer({ maxPending: 1 }), disposeRenderer: true,
    commit: formula => { document.getElementById('saved')!.textContent = formula.latex; return true; } });
  instances.set(host.dataset.editor!, { editor, host, view: createStandaloneMathView(editor, host) });
}

/**
 * Reads this external application's model/view ownership for integration tests.
 * @param id - Consumer instance identity.
 * @returns Separate public editor and native binding lifetimes.
 */
export function getStandaloneInstance(id: string): StandaloneMathInstance {
  const instance = instances.get(id); if (!instance) throw new Error('Unknown standalone instance'); return instance;
}
/**
 * Replaces only the external UI, proving state/history survives framework remounting.
 * @param id - Consumer instance identity.
 */
export function remountStandaloneView(id: string): void {
  const instance = getStandaloneInstance(id); instance.view?.destroy(); instance.view = createStandaloneMathView(instance.editor, instance.host);
}
