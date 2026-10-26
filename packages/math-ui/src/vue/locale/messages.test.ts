import { describe, expect, it } from 'vitest';
import { mathCommandCategories } from '@quirekit/math';
import { mathUiMessages } from './messages';
import { resolveMathUiText } from './context';

describe('formula panel copy', () => {
  it('covers the same interface copy in every language', () => {
    const keys = (locale: keyof typeof mathUiMessages) => Object.keys(mathUiMessages[locale]).filter(key => key !== 'diagnostics').sort();
    expect(keys('en')).toEqual(keys('zh-CN'));
    expect(Object.keys(mathUiMessages.en.feedback).sort()).toEqual(Object.keys(mathUiMessages['zh-CN'].feedback).sort());
  });

  it('names categories in the active language only', () => {
    const basic = mathCommandCategories.find(item => item.value === 'basic')!;
    expect(resolveMathUiText('zh-CN').name(basic)).toBe('分数、根式与角标');
    expect(resolveMathUiText('en').name(basic)).toBe('Fractions, roots and scripts');
    expect(resolveMathUiText(undefined).locale).toBe('zh-CN');
  });
});
