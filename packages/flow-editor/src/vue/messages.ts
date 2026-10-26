import { computed } from "vue";
import { useQuireKitLocale } from "@quirekit/ui/vue";
import { flowEditorFailure, flowEditorText, resolveFlowLocale } from "../locale/resolve";
import type { FlowMessageValues } from "../locale/types";

/** @returns Provider-scoped reactive messages; no graph reads or document subscriptions. */
export function useFlowMessages() {
  const inherited = useQuireKitLocale(), locale = computed(() => resolveFlowLocale(inherited.value));
  return { locale,
    /** @param source - Feature message key. @param values - Literal substitutions. @returns Current-language copy. */
    t: (source: string, values?: FlowMessageValues) => flowEditorText(locale.value, source, values),
    /** @param error - Original diagnostic. @returns Current-language error presentation. */
    failure: (error: unknown) => flowEditorFailure(locale.value, error),
  };
}
