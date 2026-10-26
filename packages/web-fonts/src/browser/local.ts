let probeSequence = 0;

/** Options used by the exact local-font probe. */
export interface QuireLocalFontProbeOptions {
  /** FontFace constructor from the target browser realm. */
  readonly FontFace: typeof FontFace;
}

/**
 * Creates a local-family probe that never adds probe aliases to document.fonts.
 *
 * @param options - Target browser FontFace constructor.
 * @returns Async exact-family availability probe.
 */
export function createQuireLocalFontProbe(
  options: QuireLocalFontProbeOptions
): (family: string) => Promise<boolean> {
  return async (family: string): Promise<boolean> => {
    const trimmed = family.trim();
    if (trimmed.length === 0) return false;
    const alias = `__quire_local_font_probe_${++probeSequence}`;
    const source = `local("${escapeCssString(trimmed)}")`;
    try {
      const face = new options.FontFace(alias, source);
      await face.load();
      return face.status === "loaded";
    } catch {
      return false;
    }
  };
}

/**
 * Escapes a family for a double-quoted CSS local() source.
 *
 * @param value - Raw family name.
 * @returns CSS string content.
 */
function escapeCssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
