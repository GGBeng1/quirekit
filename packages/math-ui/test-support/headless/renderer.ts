import { createMathEditor } from '@quirekit/math';
import type { MathEditor, MathFormulaLayout } from '@quirekit/math';
import { createStandaloneMathView } from './view';

/**
 * Mounts a contract-test backend whose output contains no MathJax elements or attributes.
 * @param host - Consumer-owned DOM container.
 * @returns Editor and view using only renderer-neutral geometry.
 */
export function mountPlainSvgConsumer(host: HTMLElement) {
  const output: MathFormulaLayout = {
    svg: '<svg width="3em" height="1em" viewBox="0 0 3 1"><rect x=".05" y=".15" width="2.9" height=".7" fill="currentColor"/></svg>',
    width: 3, height: 1, baseline: 0.8,
    slots: [{ id: 'root', rect: { left: 0, top: 0, width: 3, height: 1 }, children: [0, 1, 2].map(left => ({ left, top: 0, width: 1, height: 1 })), boundaries: [0, 1, 2, 3] }],
  };
  const editor: MathEditor = createMathEditor({ latex: 'abc', renderer: { render: () => output } });
  const view = createStandaloneMathView(editor, host);
  return { editor, view };
}
