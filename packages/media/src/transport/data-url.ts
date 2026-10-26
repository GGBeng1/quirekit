/** Decoded portable image data URL. */
export interface QuireDecodedImageDataUrl {
  /** Canonical lower-case image MIME type. */
  readonly mimeType: string;
  /** Decoded caller-owned portable bytes. */
  readonly bytes: Uint8Array;
}

/**
 * Decodes one strict base64 image data URL without Node.js globals.
 *
 * @param value - Candidate data URL.
 * @returns Decoded image bytes, or undefined for malformed input.
 */
export function decodeQuireImageDataUrl(
  value: unknown
): QuireDecodedImageDataUrl | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const match = /^data:(image\/[a-z0-9!#$&^_.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/iu
    .exec(value);
  if (match === null) {
    return undefined;
  }
  try {
    const binary = atob(match[2] ?? "");
    if (binary.length === 0) {
      return undefined;
    }
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return {
      mimeType: (match[1] ?? "").toLowerCase(),
      bytes
    };
  } catch {
    return undefined;
  }
}

/**
 * Encodes portable image bytes as a transient base64 data URL.
 *
 * @param mimeType - Canonical image MIME type.
 * @param bytes - Non-empty portable bytes.
 * @returns Browser- and Worker-safe data URL.
 */
export function encodeQuireImageDataUrl(
  mimeType: string,
  bytes: Uint8Array
): string {
  if (
    mimeType.trim() !== mimeType
    || !/^image\/[a-z0-9!#$&^_.+-]+$/iu.test(mimeType)
    || bytes.byteLength === 0
  ) {
    throw new RangeError("Expected a canonical image MIME type and non-empty bytes.");
  }
  const chunks: string[] = [];
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, bytes.byteLength);
    let binary = "";
    for (let index = offset; index < end; index += 1) {
      binary += String.fromCharCode(bytes[index] ?? 0);
    }
    chunks.push(binary);
  }
  return `data:${mimeType.toLowerCase()};base64,${btoa(chunks.join(""))}`;
}
