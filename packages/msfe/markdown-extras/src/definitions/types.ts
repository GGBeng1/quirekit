/** A single term awaiting the already-confirmed description after one blank line. */
export interface DeferredTerm {
  /** Original term start in canonical source coordinates. */
  readonly from: number;
  /** Original one-line content, with outer container prefixes excluded. */
  readonly text: string;
  /** Physical start of the immediately following description. */
  readonly descriptionLine: number;
}
