const classicLocalFontProbeTimeoutMs = 1_000;

/** Monotonic id used only to isolate browser local-font probes. */
let nextFontProbeId = 1;

/**
 * Uses `FontFace local()` to test an exact installed family without CSS fallback.
 *
 * @param ownerDocument - Document whose browser realm owns the font API.
 * @param family - Exact local family name.
 * @returns Whether the local face loaded.
 */
export async function probeClassicLocalFontFace(
  ownerDocument: Document,
  family: string
): Promise<boolean> {
  const FontFaceConstructor = ownerDocument.defaultView?.FontFace
    ?? globalThis.FontFace;
  if (typeof FontFaceConstructor !== "function") return false;
  try {
    const alias = `QuireKit font availability ${nextFontProbeId++}`;
    const source = `local("${escapeCssString(family)}")`;
    return await loadClassicLocalFontFace(
      new FontFaceConstructor(alias, source),
      classicLocalFontProbeTimeoutMs
    );
  } catch {
    return false;
  }
}

/**
 * Loads an exact family already registered by application-owned CSS or FontFace.
 *
 * FontFaceSet.load alone is not an exact availability probe because an absent
 * family may complete through browser fallback. Enumerating the set first
 * proves that the application registered the requested family without making
 * Classic own or import its assets.
 *
 * @param fonts - Owner document FontFaceSet.
 * @param family - Exact registered family name.
 * @returns Whether at least one matching registered face loaded.
 */
export async function probeClassicRegisteredFontFace(
  fonts: FontFaceSet | undefined,
  family: string
): Promise<boolean> {
  if (fonts === undefined || typeof fonts.forEach !== "function") return false;
  const normalizedFamily = normalizeCssFontFamily(family);
  const matchingFaces: FontFace[] = [];
  fonts.forEach((face) => {
    if (normalizeCssFontFamily(face.family) === normalizedFamily) {
      matchingFaces.push(face);
    }
  });
  if (matchingFaces.length === 0) return false;
  const results = await Promise.allSettled(
    matchingFaces.map(async (face) => await face.load())
  );
  return results.some((result) => result.status === "fulfilled");
}

/**
 * Bounds browser `local()` probes that otherwise may remain pending indefinitely.
 *
 * @param face - Isolated local-only probe face.
 * @param timeoutMs - Maximum wait before treating the family as unavailable.
 * @returns Whether the local face loaded before the deadline.
 */
async function loadClassicLocalFontFace(
  face: FontFace,
  timeoutMs: number
): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      face.load(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new DOMException("Local font probe timed out", "TimeoutError")),
          timeoutMs
        );
      })
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

/**
 * Escapes one family for a double-quoted CSS string.
 *
 * @param value - Unescaped family name.
 * @returns CSS string content.
 */
function escapeCssString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

/**
 * Normalizes a single CSS family token for exact FontFaceSet comparison.
 *
 * @param value - FontFace family descriptor or logical family.
 * @returns Case-insensitive unquoted family identity.
 */
function normalizeCssFontFamily(value: string): string {
  const trimmed = value.trim();
  const unquoted = (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  )
    ? trimmed.slice(1, -1)
    : trimmed;
  return unquoted.trim().toLocaleLowerCase();
}
