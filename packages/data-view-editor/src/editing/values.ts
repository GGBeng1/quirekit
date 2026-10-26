import type { DataField, DataRecord, DataSet, DataValue } from "@quirekit/data-view";

export { formatDataValue as displayDataValue } from "@quirekit/data-view";

/** Parses text editors; semantic validation remains with the canonical operation.
 * @param field - Cell schema.
 * @param text - Complete input after composition.
 * @param primary - Whether an empty title must remain text.
 * @returns Typed candidate value.
 */
export function parseCellInput(field: DataField, text: string, primary: boolean): DataValue {
  if (text === "") return primary ? "" : null;
  if (field.type === "number") {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) throw new Error("请输入有效数字");
    const value = Number(text); if (!Number.isFinite(value)) throw new Error("数字超出范围"); return value;
  }
  return text;
}
/** Creates all field slots before any row can be committed.
 * @param data - Complete schema.
 * @param id - New stable record ID.
 * @param group - Optional board grouping assignment.
 * @returns Complete new record.
 */
export function blankDataRecord(data: DataSet, id: string, group?: {fieldId: string; value: string | null}): DataRecord {
  return {id, values: Object.fromEntries(data.fields.map(field => [field.id, field.id === data.primaryFieldId ? "" : group?.fieldId === field.id ? group.value : null]))};
}
