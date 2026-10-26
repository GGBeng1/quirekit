import { Selection, Slice, type Mappable, type Node as PMNode, type ResolvedPos, type Transaction, type SelectionBookmark } from "@quirekit/pm";

/** PM selection spanning complete, direct sibling blocks. */
export class BlockSelection extends Selection {
  /** @param from - First boundary. @param to - Last boundary. */
  constructor(from: ResolvedPos, to: ResolvedPos) { super(from, to); }
  /** @param doc - Current document. @param from - Start. @param to - End. @returns Valid selection or null. */
  static create(doc: PMNode, from: number, to: number): BlockSelection | null {
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to > doc.content.size || from >= to) return null;
    const $from = doc.resolve(from), $to = doc.resolve(to);
    if (!$from.sameParent($to) || $from.textOffset || $to.textOffset || $from.parent.inlineContent) return null;
    return new BlockSelection($from, $to);
  }
  /** @param selection - Other PM selection. @returns Structural equality. */
  eq(selection: Selection): boolean { return selection instanceof BlockSelection && selection.from === this.from && selection.to === this.to; }
  /** @param doc - New document. @param mapping - Position mapping. @returns Mapped selection. */
  map(doc: PMNode, mapping: Mappable): Selection { return this.getBookmark().map(mapping).resolve(doc); }
  /** @returns Closed slice containing the complete subtrees. */
  override content(): Slice { return this.$from.doc.slice(this.from, this.to); }
  /** @param tr - Shared transaction. @param content - Replacement slice. */
  override replace(tr: Transaction, content = Slice.empty): void {
    super.replace(tr, content);
  }
  /** @returns Durable selection representation. */
  toJSON(): { type: string; from: number; to: number } { return { type: "quire-block-range", from: this.from, to: this.to }; }
  /** @param doc - Loaded document. @param json - Serialized range. @returns Restored selection. */
  static override fromJSON(doc: PMNode, json: { from: number; to: number }): Selection {
    return new BlockSelectionBookmark(json.from, json.to).resolve(doc);
  }
  /** @returns Lightweight history bookmark. */
  override getBookmark(): SelectionBookmark {
    return new BlockSelectionBookmark(this.from, this.to, true,
      this.$from.nodeAfter?.isLeaf === false, this.$to.nodeBefore?.isLeaf === false);
  }
}

Selection.jsonID("quire-block-range", BlockSelection);

/** History bookmark for complete sibling blocks. */
export class BlockSelectionBookmark implements SelectionBookmark {
  /**
   * @param from - Start boundary.
   * @param to - End boundary.
   * @param valid - Both structural endpoints survived mapping.
   * @param startInterior - First block has a content boundary inside its opening token.
   * @param endInterior - Last block has a content boundary inside its closing token.
   */
  constructor(readonly from: number, readonly to: number, private readonly valid = true,
    private readonly startInterior = false, private readonly endInterior = false) {}
  /** @param mapping - Transaction maps. @returns Mapped bookmark. */
  map(mapping: Mappable): SelectionBookmark {
    const from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
    // Attribute/type changes replace the wrapper tokens while preserving content.
    // Probe that retained interior only for survival; outer positions remain the
    // selection authority, so text edits never move a boundary inside its block.
    const startSurvives = !from.deleted || (this.startInterior && !mapping.mapResult(this.from + 1, 1).deletedAcross);
    const endSurvives = !to.deleted || (this.endInterior && !mapping.mapResult(this.to - 1, -1).deletedAcross);
    return new BlockSelectionBookmark(from.pos, to.pos, this.valid && startSurvives && endSurvives,
      this.startInterior, this.endInterior);
  }
  /** @param doc - Restored document. @returns Structural selection or valid fallback. */
  resolve(doc: PMNode): Selection {
    const selection = this.valid ? BlockSelection.create(doc, this.from, this.to) : null;
    const from = Number.isSafeInteger(this.from) ? this.from : 0;
    return selection ?? Selection.near(doc.resolve(Math.max(0, Math.min(from, doc.content.size))));
  }
}
