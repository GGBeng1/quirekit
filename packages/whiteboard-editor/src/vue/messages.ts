import { computed } from "vue";
import { useQuireKitLocale } from "@quirekit/ui/vue";
import { whiteboardMessages, whiteboardErrorMessage } from "../locale/resolve";
import type { WhiteboardMessages } from "../locale/types";

/** @returns Provider-owned language and reactive feature text; no document or runtime subscriptions. */
export function useWhiteboardMessages() {
  const inherited = useQuireKitLocale();
  const locale = computed(() => inherited.value);
  return { locale, text: computed(() => whiteboardMessages(locale.value)),
    /** @param error - Original diagnostic. @param fallback - Unknown-error recovery advice. @returns Current translated presentation. */
    failure: (error: unknown, fallback?: keyof WhiteboardMessages) => whiteboardErrorMessage(error, locale.value, fallback),
  };
}
