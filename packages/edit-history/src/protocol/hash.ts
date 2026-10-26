/** @param value - Text to hash. @returns `fnv1a64:` and 16 hex digits over the UTF-8 bytes, used to deduplicate version content. */
export function contentHash(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  return `fnv1a64:${hash.toString(16).padStart(16, "0")}`;
}
