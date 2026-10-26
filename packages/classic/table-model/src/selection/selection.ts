import {
  Selection,
  Slice,
  type Mappable,
  type Node as PMNode,
  type ResolvedPos,
  type SelectionBookmark,
  type Transaction
} from "@quirekit/pm";
import type {
  WordTableGridRect,
  WordTableSemanticCellRef
} from "../map";
import { serializeWordTableSelection } from "../clipboard/serialize";
import { createWordTableSelectionSlice } from "../clipboard/slice";
import { WordTableSelectionBookmark } from "./bookmark";
import {
  readWordTableSelectionJSON,
  WORD_TABLE_SELECTION_JSON_ID
} from "./json";
import { rectsEqual } from "./rect";
import { replaceWordTableSelection } from "./replace";
import { resolveWordTableSelection } from "./resolve";
import type {
  ResolvedWordTableSelection,
  WordTableSelectionClipboardData,
  WordTableSelectionCreateOptions,
  WordTableSelectionJSON,
  WordTableSelectionMode
} from "./types";

/** Structural selection over Word-compatible table cells. */
export class WordTableSelection extends Selection {
  /** Absolute ProseMirror position before the selected `wordTable` node. */
  readonly tablePos: number;

  /** Table-relative position before the anchor explicit cell. */
  readonly anchorCellPos: number;

  /** Table-relative position before the head explicit cell. */
  readonly headCellPos: number;

  /** Structural selection mode. */
  readonly mode: WordTableSelectionMode;

  /** Expanded grid rect covered by the selection. */
  readonly rect: WordTableGridRect;

  /** Semantic cells selected by the expanded grid rect. */
  readonly cells: readonly WordTableSemanticCellRef[];

  /**
   * Creates a structural Word table selection from resolved positions.
   *
   * @param $anchor - Resolved anchor explicit cell position.
   * @param $head - Resolved head explicit cell position.
   * @param data - Resolved table selection data.
   */
  constructor(
    $anchor: ResolvedPos,
    $head: ResolvedPos,
    data: ResolvedWordTableSelection
  ) {
    super($anchor, $head, data.ranges);
    this.tablePos = data.tablePos;
    this.anchorCellPos = data.anchorCellPos;
    this.headCellPos = data.headCellPos;
    this.mode = data.mode;
    this.rect = data.rect;
    this.cells = data.cells;
  }

  /**
   * Creates a structural Word table selection from document positions.
   *
   * @param doc - Source ProseMirror document.
   * @param options - Table and cell positions to select.
   * @returns Structural Word table selection.
   */
  static create(
    doc: PMNode,
    options: WordTableSelectionCreateOptions
  ): WordTableSelection {
    const data = resolveWordTableSelection(doc, options);

    return new WordTableSelection(data.$anchor, data.$head, data);
  }

  /**
   * Compares this selection with another ProseMirror selection.
   *
   * @param selection - Selection to compare.
   * @returns True when both selections address the same table cells.
   */
  eq(selection: Selection): boolean {
    return selection instanceof WordTableSelection &&
      selection.tablePos === this.tablePos &&
      selection.anchorCellPos === this.anchorCellPos &&
      selection.headCellPos === this.headCellPos &&
      selection.mode === this.mode &&
      rectsEqual(selection.rect, this.rect);
  }

  /**
   * Maps the selection through a ProseMirror mapping.
   *
   * @param doc - New document after the mapping.
   * @param mapping - Mapping to apply.
   * @returns Mapped Word table selection or a nearby fallback selection.
   */
  map(doc: PMNode, mapping: Mappable): Selection {
    return this.getBookmark().map(mapping).resolve(doc);
  }

  /**
   * Returns the selected table cells as a copied table slice.
   *
   * @returns Internal ProseMirror slice for clipboard serialization.
   */
  content(): Slice {
    return createWordTableSelectionSlice(this);
  }

  /**
   * Replaces the selection with Word-compatible structural table semantics.
   *
   * @param tr - Transaction receiving replacement steps.
   * @param content - Replacement slice.
   */
  replace(tr: Transaction, content = Slice.empty): void {
    const replacement = replaceWordTableSelection(this, tr, content);
    if (replacement) {
      if (typeof replacement !== "boolean") {
        tr.setSelection(WordTableSelection.create(tr.doc, replacement));
      }
      return;
    }

    super.replace(tr, content);
  }

  /**
   * Serializes this structural selection for rich clipboard writers.
   *
   * @returns Internal slice, static-display HTML slice, and TSV fallback.
   */
  serializeClipboard(): WordTableSelectionClipboardData {
    const data = serializeWordTableSelection(this);

    return {
      slice: data.slice,
      htmlSlice: data.htmlSlice,
      plainText: data.tsv
    };
  }

  /**
   * Serializes this selection for editor state persistence.
   *
   * @returns JSON payload registered under the Word table selection id.
   */
  toJSON(): WordTableSelectionJSON {
    return {
      type: WORD_TABLE_SELECTION_JSON_ID,
      tablePos: this.tablePos,
      anchorCellPos: this.anchorCellPos,
      headCellPos: this.headCellPos,
      mode: this.mode
    };
  }

  /**
   * Restores a Word table selection from JSON.
   *
   * @param doc - Document that owns the restored selection.
   * @param json - Serialized Word table selection payload.
   * @returns Restored Word table selection.
   */
  static fromJSON(doc: PMNode, json: unknown): WordTableSelection {
    return WordTableSelection.create(
      doc,
      readWordTableSelectionJSON(json)
    );
  }

  /**
   * Creates a bookmark used by history and transaction mapping.
   *
   * @returns Document-independent Word table selection bookmark.
   */
  getBookmark(): SelectionBookmark {
    return new WordTableSelectionBookmark({
      tablePos: this.tablePos,
      anchorCellPos: this.anchorCellPos,
      headCellPos: this.headCellPos,
      mode: this.mode,
      invalid: false
    }, WordTableSelection.create);
  }
}

WordTableSelection.prototype.visible = false;

Selection.jsonID(WORD_TABLE_SELECTION_JSON_ID, WordTableSelection);
