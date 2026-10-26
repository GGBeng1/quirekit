import type { WordTableStyleLook } from "../types";

/** Word's assumed look when a table omits `w:tblLook` (0x04A0). */
export const defaultWordTableStyleLook: WordTableStyleLook = Object.freeze({
  firstRow: true,
  lastRow: false,
  firstColumn: true,
  lastColumn: false,
  bandedRows: true,
  bandedColumns: false
});

const lookBits = {
  firstRow: 0x0020,
  lastRow: 0x0040,
  firstColumn: 0x0080,
  lastColumn: 0x0100,
  noHBand: 0x0200,
  noVBand: 0x0400
} as const;

/**
 * Resolves the effective look of one table from its canonical `tableLook`.
 *
 * Word reads the legacy `val` bitmask only when none of the boolean
 * attributes are present, and treats a missing look as 0x04A0.
 *
 * @param value - Candidate `wordTable.attrs.tableLook`.
 * @returns Effective look switches.
 */
export function resolveWordTableStyleLook(value: unknown): WordTableStyleLook {
  if (value === null || typeof value !== "object") return defaultWordTableStyleLook;
  const look = value as Readonly<Record<string, unknown>>;
  const names = ["firstRow", "lastRow", "firstColumn", "lastColumn", "bandedRows", "bandedColumns"] as const;
  if (names.some(name => typeof look[name] === "boolean")) {
    return {
      firstRow: look.firstRow === true,
      lastRow: look.lastRow === true,
      firstColumn: look.firstColumn === true,
      lastColumn: look.lastColumn === true,
      bandedRows: look.bandedRows !== false,
      bandedColumns: look.bandedColumns !== false
    };
  }
  const bits = typeof look.rawValue === "string" ? Number.parseInt(look.rawValue, 16) : Number.NaN;
  if (!Number.isFinite(bits)) return defaultWordTableStyleLook;
  return {
    firstRow: (bits & lookBits.firstRow) !== 0,
    lastRow: (bits & lookBits.lastRow) !== 0,
    firstColumn: (bits & lookBits.firstColumn) !== 0,
    lastColumn: (bits & lookBits.lastColumn) !== 0,
    bandedRows: (bits & lookBits.noHBand) === 0,
    bandedColumns: (bits & lookBits.noVBand) === 0
  };
}

/**
 * Serializes look switches into the canonical `tableLook` attribute.
 *
 * @param look - Effective look switches.
 * @returns Canonical table look with a synchronized legacy bitmask.
 */
export function createWordTableLookAttrs(look: WordTableStyleLook): Readonly<Record<string, unknown>> {
  let bits = 0;
  if (look.firstRow) bits |= lookBits.firstRow;
  if (look.lastRow) bits |= lookBits.lastRow;
  if (look.firstColumn) bits |= lookBits.firstColumn;
  if (look.lastColumn) bits |= lookBits.lastColumn;
  if (!look.bandedRows) bits |= lookBits.noHBand;
  if (!look.bandedColumns) bits |= lookBits.noVBand;
  return {
    ...look,
    rawValue: bits.toString(16).toUpperCase().padStart(4, "0")
  };
}
