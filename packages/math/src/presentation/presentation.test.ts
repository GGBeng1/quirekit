import { expect, it, vi } from 'vitest';
import { parseMathLatex } from '../latex/parse';
import type { MathFormulaLayout } from '../output/layout/types';
import type { MathDocument } from '../model/types';
import { createMathPresentation } from './create';

/**
 * Admits a test formula without any browser globals.
 * @param source - Exact fixture source.
 * @returns Complete supported formula.
 */
function document(source: string): MathDocument { const result = parseMathLatex(source); if (!result.ok) throw new Error(source); return result.document; }
/**
 * Supplies a deterministic renderer-neutral output.
 * @param source - Formula identity used in the graphic.
 * @returns Matching fake geometry, sufficient for presentation ownership tests.
 */
function layout(source: string): MathFormulaLayout { return { svg: `<svg>${source}</svg>`, width: 1, height: 1, baseline: 0.8, slots: [] }; }

it('coalesces presentation only, rejects stale outputs, and respects borrowed renderer ownership', async () => {
  const completions: ((value: MathFormulaLayout) => void)[] = [];
  const render = vi.fn(() => new Promise<MathFormulaLayout>(resolve => completions.push(resolve)));
  const dispose = vi.fn(); const presenter = createMathPresentation({ renderer: { render, dispose }, editable: true });
  const a = document('a'); const c = document('c');
  presenter.update(a); presenter.update(document('b')); presenter.update(c);
  expect(render).toHaveBeenCalledTimes(1);
  completions[0]!(layout('a')); await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(2));
  expect(presenter.getSnapshot().ready).toBe(false);
  completions[1]!(layout('c')); await vi.waitFor(() => expect(presenter.getSnapshot().ready).toBe(true));
  expect(presenter.getSnapshot().layout?.svg).toBe('<svg>c</svg>');
  presenter.update(c); expect(render).toHaveBeenCalledTimes(2);
  presenter.update(c, false); expect(presenter.getSnapshot().ready).toBe(false);
  presenter.update(c); expect(presenter.getSnapshot().ready).toBe(true);
  expect(render).toHaveBeenCalledTimes(2);
  presenter.destroy(); expect(dispose).not.toHaveBeenCalled();
});

it('retains the last graphic on failure and cannot publish after destruction', async () => {
  let fail = false;
  const render = vi.fn(async (doc: MathDocument) => { if (fail) throw new Error('renderer failed'); return layout(doc.latex); });
  const dispose = vi.fn(); const presenter = createMathPresentation({ renderer: { render, dispose }, disposeRenderer: true });
  presenter.update(document('x')); await vi.waitFor(() => expect(presenter.getSnapshot().ready).toBe(true));
  fail = true; presenter.update(document('y')); await vi.waitFor(() => expect(presenter.getSnapshot().error).toBe('renderer failed'));
  expect(presenter.getSnapshot().layout?.svg).toBe('<svg>x</svg>');
  expect(presenter.getSnapshot().ready).toBe(false);
  presenter.destroy(); presenter.destroy(); const final = presenter.getSnapshot();
  presenter.update(document('z')); expect(presenter.getSnapshot()).toBe(final);
  expect(dispose).toHaveBeenCalledTimes(1);
});
