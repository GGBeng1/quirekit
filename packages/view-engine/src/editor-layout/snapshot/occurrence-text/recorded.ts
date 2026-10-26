/** Candidate text map recording every anchor a compile looks up. */
export class RecordedOccurrenceValues extends Map<string, string> {
  /** Anchors looked up so far and the text each one received. */
  readonly reads = new Map<string, string | undefined>();

  /**
   * @param id - Source anchor id.
   * @returns Candidate text, or undefined when the stored text applies.
   */
  override get(id: string): string | undefined {
    const text = super.get(id);
    this.reads.set(id, text);
    return text;
  }
}
