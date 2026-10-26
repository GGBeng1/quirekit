import type { ExtractedProofingSegment, ProofingTextSlice } from "./types";

/** Segment under construction. */
interface OpenSegment {
  /** Text fragments. */
  readonly parts: string[];
  /** Language shared by every letter of the segment. */
  readonly language: string | null;
  /** Offset map. */
  readonly slices: ProofingTextSlice[];
  /** Code units appended so far. */
  length: number;
  /** Whether a letter was appended, so all-punctuation runs can be dropped. */
  hasLetter: boolean;
  /** Whether nothing precedes the segment in its textblock. */
  readonly startsBlock: boolean;
}

/** Accumulates same-language segments and their offset maps for one textblock. */
export class ProofingSegmentBuilder {
  private readonly segments: ExtractedProofingSegment[] = [];
  private current: OpenSegment | null = null;
  private seenContent = false;

  /**
   * Language of the open segment, which neutral characters continue.
   *
   * @returns Open language, or undefined when no segment is open.
   */
  get openLanguage(): string | null | undefined {
    return this.current?.language;
  }

  /**
   * Appends one code point at a document position.
   *
   * @param character - Code point (one or two code units).
   * @param pos - Document position of its first code unit.
   * @param language - Language of the code point.
   * @param letter - Whether the code point is a letter.
   */
  append(character: string, pos: number, language: string | null, letter: boolean): void {
    if (this.current === null || this.current.language !== language) {
      this.close();
      this.current = { parts: [], language, slices: [], length: 0, hasLetter: false, startsBlock: !this.seenContent };
    }
    const segment = this.current;
    const last = segment.slices[segment.slices.length - 1];
    if (last !== undefined && last.offset + last.length === segment.length && last.pos + last.length === pos) {
      segment.slices[segment.slices.length - 1] = { ...last, length: last.length + character.length };
    } else {
      segment.slices.push({ offset: segment.length, pos, length: character.length });
    }
    segment.parts.push(character);
    segment.length += character.length;
    segment.hasLetter ||= letter;
    this.seenContent = true;
  }

  /** Separates words with one unmapped space, collapsing repeated boundaries. */
  boundary(): void {
    this.seenContent = true;
    const segment = this.current;
    if (segment === null || segment.length === 0 || segment.parts[segment.parts.length - 1] === " ") return;
    segment.parts.push(" ");
    segment.length += 1;
  }

  /**
   * Closes the open segment and returns every kept segment.
   *
   * @returns Segments containing at least one letter.
   */
  finish(): ExtractedProofingSegment[] {
    this.close();
    return this.segments;
  }

  /** Keeps the open segment when it holds a letter. */
  private close(): void {
    const segment = this.current;
    this.current = null;
    if (segment === null || !segment.hasLetter) return;
    this.segments.push({
      text: segment.parts.join(""),
      language: segment.language,
      slices: segment.slices,
      startsBlock: segment.startsBlock
    });
  }
}
