import type { CanvasPageContentVersionParts } from "./types";

/** One registered exact page content version. */
interface CanvasPageContentVersionEntry {
  /** Registered id; ids increase and are never reused. */
  readonly id: number;
  /** Bucket hash of every compared part. */
  readonly hash: number;
  /** Scalar dependencies: chunk, page, rectangle, scale, backing size and painter. */
  readonly scalars: string;
  /** Source owner keys in page order. */
  readonly ownerKeys: readonly string[];
  /** Serialized paint signature of every command, in paint order. */
  readonly commands: readonly string[];
}

/**
 * Registers exact page content versions under compact ids.
 *
 * Two inputs share an id only when every compared part is equal, so comparing ids is exactly
 * comparing the full content versions, without building one string per page per frame.
 */
export class CanvasPageContentVersionRegistry {
  /** Next id; ids are never reused, so an evicted version can only miss, never match wrongly. */
  private nextId = 1;
  /** Entries grouped by hash. */
  private readonly buckets = new Map<number, CanvasPageContentVersionEntry[]>();
  /** Entries by id in least-recently-used order. */
  private readonly recent = new Map<number, CanvasPageContentVersionEntry>();

  /**
   * Creates an empty registry.
   *
   * @param maxEntries - Entries kept; mounted pages touch theirs every frame.
   * @param onEvict - Receives ids that can never be resolved again.
   */
  constructor(
    private readonly maxEntries: number,
    private readonly onEvict: (id: number) => void
  ) {}

  /**
   * Resolves the id of one exact content version, registering it when new.
   *
   * @param parts - Compared parts of the version.
   * @returns Id equal to a previous result exactly when every part is equal.
   */
  resolve(parts: CanvasPageContentVersionParts): number {
    const hash = hashParts(parts);
    const bucket = this.buckets.get(hash);
    const match = bucket?.find((entry) => matches(entry, parts));
    if (match !== undefined) {
      this.recent.delete(match.id);
      this.recent.set(match.id, match);
      return match.id;
    }

    const commands = new Array<string>(parts.commandCount);
    for (let index = 0; index < parts.commandCount; index += 1) commands[index] = parts.readCommand(index);
    const entry: CanvasPageContentVersionEntry = {
      id: this.nextId,
      hash,
      scalars: parts.scalars,
      ownerKeys: [...parts.ownerKeys],
      commands
    };
    this.nextId += 1;
    if (bucket === undefined) this.buckets.set(hash, [entry]);
    else bucket.push(entry);
    this.recent.set(entry.id, entry);
    this.evictBeyondLimit();
    return entry.id;
  }

  /** Removes least recently used entries beyond the limit. */
  private evictBeyondLimit(): void {
    for (const [id, entry] of this.recent) {
      if (this.recent.size <= this.maxEntries) return;
      this.recent.delete(id);
      const bucket = this.buckets.get(entry.hash)!;
      bucket.splice(bucket.indexOf(entry), 1);
      if (bucket.length === 0) this.buckets.delete(entry.hash);
      this.onEvict(id);
    }
  }
}

/**
 * Hashes a string with 32-bit FNV-1a.
 *
 * @param text - Text to hash.
 * @returns Unsigned 32-bit hash.
 */
export function hashCanvasPageContentText(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Combines every compared part into one bucket hash.
 *
 * @param parts - Compared parts.
 * @returns Unsigned 32-bit hash.
 */
function hashParts(parts: CanvasPageContentVersionParts): number {
  let hash = hashCanvasPageContentText(parts.scalars);
  for (const key of parts.ownerKeys) hash = Math.imul(hash ^ hashCanvasPageContentText(key), 0x01000193);
  hash = Math.imul(hash ^ parts.commandCount, 0x01000193);
  for (let index = 0; index < parts.commandCount; index += 1) {
    hash = Math.imul(hash ^ parts.readCommandHash(index), 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Compares a registered version with new parts item by item.
 *
 * @param entry - Registered version.
 * @param parts - Parts being resolved.
 * @returns Whether every part is equal.
 */
function matches(entry: CanvasPageContentVersionEntry, parts: CanvasPageContentVersionParts): boolean {
  if (entry.scalars !== parts.scalars
    || entry.ownerKeys.length !== parts.ownerKeys.length
    || entry.commands.length !== parts.commandCount) return false;
  for (let index = 0; index < entry.ownerKeys.length; index += 1) {
    if (entry.ownerKeys[index] !== parts.ownerKeys[index]) return false;
  }
  for (let index = 0; index < entry.commands.length; index += 1) {
    if (entry.commands[index] !== parts.readCommand(index)) return false;
  }
  return true;
}
