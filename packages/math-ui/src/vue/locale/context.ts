import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue';
import { mathUiMessages } from './messages';
import type { MathUiLocale, MathUiText } from './types';

const mathUiTextKey: InjectionKey<ComputedRef<MathUiText>> = Symbol('quirekit-math-ui-text');

/**
 * Resolves interface copy for one language.
 * @param locale - Requested language; Chinese when absent.
 * @returns Localized copy.
 */
export function resolveMathUiText(locale: MathUiLocale | undefined): MathUiText {
  const active = locale ?? 'zh-CN';
  return { locale: active, messages: mathUiMessages[active], name: item => active === 'en' && item.english ? item.english : item.label };
}

/**
 * Makes the panel language available to every descendant, including floating choosers.
 * @param locale - Reactive language source.
 * @returns Localized copy for the providing component.
 */
export function provideMathUiText(locale: () => MathUiLocale | undefined): ComputedRef<MathUiText> {
  const text = computed(() => resolveMathUiText(locale()));
  provide(mathUiTextKey, text);
  return text;
}

/**
 * Reads the panel language; components used outside a panel fall back to Chinese.
 * @returns Localized copy.
 */
export function useMathUiText(): ComputedRef<MathUiText> {
  return inject(mathUiTextKey, () => computed(() => resolveMathUiText(undefined)), true);
}
