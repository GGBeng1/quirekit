import { quireKitDefaultLocale } from "../../locale/resolve";
import type { Messages as QuireKitIconCatalogMessages } from "../../locale/components/icon-catalog";
import { quireKitEditorIconGroups, quireKitIconAliases } from "./metadata";
import type {
  QuireKitEditorIconEntry, QuireKitEditorIconGroup, QuireKitEditorIconName, QuireKitIconData
} from "./types";

const groupCache = new WeakMap<QuireKitIconCatalogMessages, readonly QuireKitEditorIconGroup[]>();

/**
 * Labels the language-independent icon groups with one language's catalog text.
 * Results are cached per messages object, so repeated calls with the active pack are cheap.
 * @param messages - Icon catalog text of the active language; defaults to Chinese.
 * @returns Groups and icons in browsing order with display labels.
 */
export function getQuireKitEditorIconGroups(
  messages: QuireKitIconCatalogMessages = quireKitDefaultLocale.messages.iconCatalog
): readonly QuireKitEditorIconGroup[] {
  const cached = groupCache.get(messages);
  if (cached) return cached;
  const groups = Object.freeze(quireKitEditorIconGroups.map((group): QuireKitEditorIconGroup => Object.freeze({
    id: group.id,
    label: messages.groups[group.id] ?? group.id,
    category: group.category,
    scope: group.scope,
    icons: Object.freeze(group.icons.map(icon => Object.freeze({
      name: icon.name, upstream: icon.upstream, label: messages.icons[icon.name] ?? icon.name
    })))
  })));
  groupCache.set(messages, groups);
  return groups;
}

/**
 * Builds searchable catalog entries for one language.
 * @param messages - Icon catalog text of the requested language.
 * @param data - Renderer data for every canonical icon name.
 * @returns Entries in explicit task and family order, never alphabetical order.
 */
export function buildQuireKitEditorIconCatalog(
  messages: QuireKitIconCatalogMessages,
  data: Readonly<Record<string, QuireKitIconData>>
): readonly QuireKitEditorIconEntry[] {
  return Object.freeze(getQuireKitEditorIconGroups(messages).flatMap(group =>
    group.icons.map((icon): QuireKitEditorIconEntry => Object.freeze({
      name: icon.name as QuireKitEditorIconName,
      label: icon.label,
      category: group.category,
      group: group.id,
      scope: group.scope,
      upstream: icon.upstream === "custom" ? undefined : icon.upstream,
      keywords: Object.freeze([
        icon.label, ...(messages.keywords[icon.name as keyof typeof messages.keywords] ?? []), group.label,
        icon.name.replace(/([a-z0-9])([A-Z])/gu, "$1 $2").toLowerCase(),
        icon.upstream,
        ...Object.entries(quireKitIconAliases).filter(([, target]) => target === icon.name)
          .map(([alias]) => alias)
      ]),
      data: data[icon.name] as QuireKitIconData
    }))
  ));
}
