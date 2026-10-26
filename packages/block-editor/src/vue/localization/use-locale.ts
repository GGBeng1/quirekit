import { useQuireKitLocale } from "@quirekit/ui/vue";
import { computed } from "vue";
import { translateBlockText, localizeBlockEntries } from "../../localization/text";
import type { BlockEditorLocale, BlockTextValues } from "../../localization/types";

/** @returns Reactive product copy sharing the public component locale, including teleported surfaces. */
export function useBlockLocale() {
  const inherited = useQuireKitLocale();
  const locale = computed<BlockEditorLocale>(() => inherited.value.toLowerCase().startsWith("en") ? "en" : "zh-CN");
  /** @param source - Product message, never document text. @param values - Named interpolation values. @returns Localized interface text. */
  const t = (source: string, values?: BlockTextValues): string => translateBlockText(locale.value, source, values);
  /** @param entries - Visible interface catalog. @returns Copy-only projection; command values and callbacks retain identity. */
  const localize = <T>(entries: T): T => localizeBlockEntries(locale.value, entries);
  return { locale, t, localize };
}
