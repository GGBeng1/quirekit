import type { Messages as PickerMessages } from "../../../locale/components/picker";

/**
 * Names an editable segment in its field context; literal separators stay decorative.
 * @param field - Accessible name of the field or endpoint.
 * @param type - Ark segment type.
 * @param text - Picker messages of the active language.
 * @returns Field-plus-segment name, or undefined for literals.
 */
export function segmentLabel(field: string, type: string, text: PickerMessages): string | undefined {
  if (type === "literal") return undefined;
  return text.part(field, text.segments[type as keyof PickerMessages["segments"]] ?? type);
}
