import type { QuireKitMenuEntry, QuireKitToolbarEntry, QuireKitToolbarRow } from "@quirekit/ui";
import { flowEditorText } from "./resolve";

/** @param entries - Feature-owned menu/toolbar definitions, never saved graph or library content. @param locale - Interface language.
 * @returns Same identities and payloads with only known presentation fields localized. */
export function localizeFlowEntries<T extends QuireKitToolbarEntry | QuireKitMenuEntry | QuireKitToolbarRow>(entries: readonly T[], locale: string): readonly T[] {
  return entries.map(entry => {
    const next = { ...entry } as Record<string, unknown>;
    for (const key of ["label", "text", "tooltip", "disabledReason", "actionLabel", "disclosureLabel"]) if (typeof next[key] === "string") next[key] = flowEditorText(locale, next[key]);
    for (const key of ["items", "children"]) if (Array.isArray(next[key])) next[key] = localizeFlowEntries(next[key], locale);
    return next as T;
  });
}
