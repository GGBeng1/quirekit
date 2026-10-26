import type { DataField, DataOption, DataOptionColor, DataTableDensity } from "@quirekit/data-view";
import type { QuireKitControlSize } from "@quirekit/ui";

/** Fixed semantic choices shared by tags, field options and board headings. */
export const optionColors: readonly {value: DataOptionColor; label: string}[] = [
  {value: "neutral", label: "灰色"}, {value: "primary", label: "主题色"}, {value: "info", label: "蓝色"},
  {value: "success", label: "绿色"}, {value: "warning", label: "橙色"}, {value: "danger", label: "红色"}
];
/** Gives old documents stable color without rewriting their data.
 * @param option - Option with optional authored color.
 * @returns Theme semantic color independent of option label and order.
 */
export function optionColor(option: DataOption): DataOptionColor {
  if (option.color) return option.color;
  let hash = 0;
  for (const char of option.id) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return optionColors[hash % optionColors.length]!.value;
}
/** @param field - Declared field kind. @returns Registered semantic icon name. */
export function fieldIcon(field: DataField): string {
  return ({text: "type", number: "listNumbered", boolean: "check", date: "calendar", datetime: "clock", singleSelect: "circle", multiSelect: "listFilter"})[field.type];
}
/** @param density - Saved table spacing. @returns Public size shared by table and cells. */
export function tableSize(density?: DataTableDensity): QuireKitControlSize {
  return density === "compact" ? "xs" : density === "comfortable" ? "md" : "sm";
}
