/** One canonical footnote occurrence; no rendered body or duplicated AST is stored. */
export interface FootnoteOccurrence {
  /** Normalized matching identity. */
  readonly label: string;
  /** Inclusive source start. */
  readonly from: number;
  /** Exclusive source end. */
  readonly to: number;
}

/** Resolution for one first-definition-wins label. */
export interface FootnoteEntry {
  /** First matching definition, or absence. */
  readonly definition: FootnoteOccurrence | undefined;
  /** References in canonical source order. */
  readonly references: readonly FootnoteOccurrence[];
  /** First-use number; absent for unresolved or unreferenced definitions. */
  readonly number: number | undefined;
}

/** Accepted semantic result; pending must never be reported as missing. */
export interface FootnoteIndex {
  /** Whether the accepted tree covers the complete source. */
  readonly status: "ready" | "pending";
  /** Entries keyed by normalized label. */
  readonly entries: ReadonlyMap<string, FootnoteEntry>;
  /** Inline notes keyed by their canonical source start, numbered in the same first-use sequence. */
  readonly inline: ReadonlyMap<number, number>;
}

/** Actual work tied to an immutable parser tree. */
export interface FootnoteWork {
  /** Full indexes built for this accepted tree. */
  readonly builds: number;
  /** Parser nodes visited by the build. */
  readonly visitedNodes: number;
}

/** Localized navigation labels; the feature does not prescribe a UI skin. */
export interface FootnoteOptions {
  /** @param number - Generated first-use number. @returns Accessible reference action. */
  readonly referenceLabel: (number: number) => string;
  /** @param number - Generated first-use number. @returns Accessible definition return action. */
  readonly definitionLabel: (number: number) => string;
}
