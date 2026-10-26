/** @param dataUrl - PNG or JPEG data URI. @returns Pixel size read from the file header, or undefined when unreadable. */
export function imageSize(dataUrl: string): { width: number; height: number } | undefined {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1, dataUrl.indexOf(',') + 1 + 65_536));
  const byte = (index: number): number => binary.charCodeAt(index) & 0xff;
  const word = (index: number): number => (byte(index) << 8) | byte(index + 1);
  if (binary.startsWith('\x89PNG')) return { width: (word(16) << 16) | word(18), height: (word(20) << 16) | word(22) };
  // JPEG: walk segments until a start-of-frame marker, which carries the size.
  for (let index = 2; index + 9 < binary.length;) {
    if (byte(index) !== 0xff) return undefined;
    const marker = byte(index + 1);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { width: word(index + 7), height: word(index + 5) };
    index += 2 + word(index + 2);
  }
  return undefined;
}

/**
 * @param dataUrl - PNG or JPEG data URI.
 * @param maxWidth - Available width in points.
 * @param maxHeight - Available height in points.
 * @returns Size in points at screen scale (96 px per inch), shrunk to fit and never enlarged.
 */
export function fitImage(dataUrl: string, maxWidth: number, maxHeight: number): { width: number; height: number } {
  const size = imageSize(dataUrl);
  if (!size?.width || !size.height) return { width: maxWidth, height: maxHeight };
  const scale = Math.min(0.75, maxWidth / size.width, maxHeight / size.height);
  return { width: size.width * scale, height: size.height * scale };
}
