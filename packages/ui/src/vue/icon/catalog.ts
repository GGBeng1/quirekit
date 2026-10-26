import { computed } from "vue";
import { getQuireKitEditorIconCatalog } from "../../components/icon/catalog";
import { getQuireKitEditorIconGroups } from "../../components/icon/labels";
import { useQuireKitMessages } from "../locale-provider/context";
import type { QuireKitEditorIconCatalogState } from "./types";

/**
 * Reads the bundled icon catalog in the language of the nearest QuireLocaleProvider.
 * @returns Reactive groups and entries that update when the language changes.
 */
export function useQuireKitEditorIconCatalog(): QuireKitEditorIconCatalogState {
  const messages = useQuireKitMessages("iconCatalog");
  return {
    groups: computed(() => getQuireKitEditorIconGroups(messages.value)),
    entries: computed(() => getQuireKitEditorIconCatalog(messages.value))
  };
}
