import type { quireKitEditorIconGroups } from "../../components/icon/metadata";

/** Stable identifier of one browsable icon group. */
export type IconCatalogGroupId = (typeof quireKitEditorIconGroups)[number]["id"];
/** Canonical icon name shown in the catalog; compatibility aliases are excluded. */
export type IconCatalogIconName = (typeof quireKitEditorIconGroups)[number]["icons"][number]["name"];

/** Icon catalog display text, keyed by the language-independent structure in the icon metadata. */
export interface Messages {
  /** Display name of every icon group. */
  readonly groups: Readonly<Record<IconCatalogGroupId, string>>;
  /** Concise display label of every canonical icon. */
  readonly icons: Readonly<Record<IconCatalogIconName, string>>;
  /** Extra search terms in this language beyond the label and group name. */
  readonly keywords: Readonly<Partial<Record<IconCatalogIconName, readonly string[]>>>;
}

export { zhCN } from "./icon-catalog/zh-hans";
export { en } from "./icon-catalog/en";
