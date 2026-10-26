import { computed } from "vue";
import { useQuireKitLocale } from "@quirekit/ui/vue";
import { mindEditorError } from "../locale/errors";
import { mindEditorTranslator } from "../locale/resolve";
import type { MindEditorTranslate, MindEditorMessageKey } from "../locale/types";

/** @returns Reactive feature messages from the nearest public locale provider. */
export function useMindEditorMessages() {
  const inherited = useQuireKitLocale();
  const locale = computed(() => inherited.value);
  const translate = computed(() => mindEditorTranslator(locale.value));
  const t: MindEditorTranslate = (key, values) => translate.value(key, values);
  return { locale, t,
    /** @param reason - Original error. @param fallback - Action explanation. @returns Localized feedback. */
    failure: (reason: unknown, fallback?: MindEditorMessageKey) => mindEditorError(reason, locale.value, fallback),
  };
}
