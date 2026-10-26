import { describe, expect, it } from 'vitest';
import { insertMathTemplate } from './insert';
import { mathTemplates } from './catalog';

describe('structural template insertion', () => {
  it('wraps selected content and enters the denominator', () => {
    const result = insertMathTemplate('x+1', 0, 3, mathTemplates[0]!);
    expect(result).toEqual({ latex: String.raw`\frac{x+1}{}`, caret: 11 });
  });
  it('enters the numerator for an empty insertion', () => {
    expect(insertMathTemplate('', 0, 0, mathTemplates[0]!)).toEqual({ latex: String.raw`\frac{}{}`, caret: 6 });
  });
  it('rejects a selection inside a command or Unicode scalar', () => {
    expect(insertMathTemplate(String.raw`\alpha`, 0, 3, mathTemplates[0]!)).toBeNull();
    expect(insertMathTemplate('𝑥', 1, 2, mathTemplates[0]!)).toBeNull();
  });
  it('rejects malformed or out-of-range templates', () => {
    expect(insertMathTemplate('x', 2, 2, mathTemplates[0]!)).toBeNull();
    expect(insertMathTemplate('x', 0, 1, { id: 'bad', label: 'bad', keywords: [], pattern: '◊◊' })).toBeNull();
  });
});
