/** Effective numbering suffix tab and the authority that supplied it. */
export interface ResolvedWordNumberingTab {
  /** Target on the paragraph's logical axis in twips. */
  readonly positionTwips: number;
  /** An effective paragraph stop, or the document's automatic tab grid. */
  readonly source: "stop" | "default-grid";
}
