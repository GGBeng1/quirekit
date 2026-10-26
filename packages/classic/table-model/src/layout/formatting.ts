import type {
  QuireTableCellFormatSpec,
  QuireTableCellValue,
  QuireTableCellValueKind,
  QuireTableFormattedCell
} from "@quirekit/layout/table";

const QUIRE_TABLE_CELL_VALUE_KINDS = new Set<QuireTableCellValueKind>([
  "empty",
  "text",
  "number",
  "date",
  "boolean",
  "rich"
]);

const QUIRE_TABLE_FORMAT_SPEC_KINDS = new Set<
  QuireTableCellFormatSpec["kind"]
>([
  "plain",
  "number",
  "currency",
  "percent",
  "date",
  "custom"
]);

/**
 * Reads formatter-ready scalar metadata from a cell preservation payload.
 *
 * @param preservation - Unknown preservation attrs from a Word table cell.
 * @returns Formatted cell metadata, or null when the payload is absent or invalid.
 */
export function readQuireTableFormattedCellFromPreservation(
  preservation: unknown
): QuireTableFormattedCell | null {
  const formattedCell = readFormattedCellPayload(preservation);

  if (!formattedCell) {
    return null;
  }

  const editText = formattedCell.editText;
  const displayText = formattedCell.displayText;

  if (typeof editText !== "string" || typeof displayText !== "string") {
    return null;
  }

  return {
    rawValue: readCellValue(formattedCell.rawValue),
    editText,
    displayText,
    formatSpec: readFormatSpec(formattedCell.formatSpec)
  };
}

/**
 * Reads a raw formatted-cell payload from `preservation.rawAttributes`.
 *
 * @param preservation - Unknown source preservation value.
 * @returns Raw formatted-cell record, or null when absent.
 */
function readFormattedCellPayload(
  preservation: unknown
): Readonly<Record<string, unknown>> | null {
  if (!preservation || typeof preservation !== "object") {
    return null;
  }

  const rawAttributes = (preservation as { readonly rawAttributes?: unknown })
    .rawAttributes;
  if (!rawAttributes || typeof rawAttributes !== "object") {
    return null;
  }

  const formattedCell = (
    rawAttributes as { readonly formattedCell?: unknown }
  ).formattedCell;

  return formattedCell && typeof formattedCell === "object"
    ? formattedCell as Readonly<Record<string, unknown>>
    : null;
}

/**
 * Reads a raw scalar value from a formatted-cell payload.
 *
 * @param value - Unknown raw value payload.
 * @returns Sanitized raw value, or null when absent or invalid.
 */
function readCellValue(value: unknown): QuireTableCellValue | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as { readonly kind?: unknown; readonly value?: unknown };
  if (
    typeof candidate.kind !== "string" ||
    !QUIRE_TABLE_CELL_VALUE_KINDS.has(candidate.kind as QuireTableCellValueKind)
  ) {
    return null;
  }

  return {
    kind: candidate.kind as QuireTableCellValueKind,
    value: candidate.value
  };
}

/**
 * Reads a formatted cell format spec from an unknown payload.
 *
 * @param spec - Unknown format spec payload.
 * @returns Sanitized format spec, or null when absent or invalid.
 */
function readFormatSpec(spec: unknown): QuireTableCellFormatSpec | null {
  if (!spec || typeof spec !== "object") {
    return null;
  }

  const candidate = spec as Readonly<Record<string, unknown>>;
  if (
    typeof candidate.kind !== "string" ||
    !QUIRE_TABLE_FORMAT_SPEC_KINDS.has(
      candidate.kind as QuireTableCellFormatSpec["kind"]
    )
  ) {
    return null;
  }

  return {
    kind: candidate.kind as QuireTableCellFormatSpec["kind"],
    ...readOptionalStringProperty(candidate, "locale"),
    ...readOptionalStringProperty(candidate, "code"),
    ...readOptionalStringProperty(candidate, "currency"),
    ...readOptionalRecordProperty(candidate, "preservation")
  };
}

/**
 * Reads an optional string property as a partial object.
 *
 * @param value - Source object.
 * @param key - Property key to read.
 * @returns Empty object or one sanitized string property.
 */
function readOptionalStringProperty<Key extends "locale" | "code" | "currency">(
  value: Readonly<Record<string, unknown>>,
  key: Key
): Pick<QuireTableCellFormatSpec, Key> | Record<string, never> {
  return typeof value[key] === "string"
    ? { [key]: value[key] } as Pick<QuireTableCellFormatSpec, Key>
    : {};
}

/**
 * Reads an optional object property as a preservation payload.
 *
 * @param value - Source object.
 * @param key - Property key to read.
 * @returns Empty object or one sanitized record property.
 */
function readOptionalRecordProperty(
  value: Readonly<Record<string, unknown>>,
  key: "preservation"
): Pick<QuireTableCellFormatSpec, "preservation"> | Record<string, never> {
  return value[key] && typeof value[key] === "object"
    ? { preservation: value[key] as Readonly<Record<string, unknown>> }
    : {};
}
