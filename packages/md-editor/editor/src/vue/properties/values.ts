import type { DocumentProperty, DocumentPropertyValue } from "@quirekit/msfe-markdown-extras";

/** @param entry - Decoded source entry. @returns Whether the built-in form can preserve its value type. */
export function propertyFormEditable(entry: DocumentProperty): boolean {
  return entry.editable && (typeof entry.value === "string" || typeof entry.value === "number" || typeof entry.value === "boolean"
    || Array.isArray(entry.value) && entry.value.every(value => typeof value === "string" && !/[\r\n]/u.test(value)));
}

/** @param entry - Decoded source entry. @returns Plain input value; string lists use one item per line. */
export function propertyDraft(entry: DocumentProperty): string {
  return Array.isArray(entry.value) ? entry.value.join("\n") : String(entry.value ?? "");
}

/** @param entry - Original typed entry. @param draft - User's text. @returns A value retaining its YAML type, or undefined for invalid input. */
export function propertyFormValue(entry: DocumentProperty, draft: string): DocumentPropertyValue | undefined {
  if (!propertyFormEditable(entry)) return undefined;
  if (Array.isArray(entry.value)) return draft === "" ? [] : draft.split(/\r?\n/u);
  if (typeof entry.value === "number") return draft.trim() && Number.isFinite(Number(draft)) ? Number(draft) : undefined;
  if (typeof entry.value === "boolean") return draft === "true" ? true : draft === "false" ? false : undefined;
  return draft;
}
