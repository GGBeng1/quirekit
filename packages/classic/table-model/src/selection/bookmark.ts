import {
  Selection,
  type Mappable,
  type Node as PMNode,
  type SelectionBookmark
} from "@quirekit/pm";
import { createFallbackSelection } from "./fallback";
import type {
  WordTableSelectionBookmarkState,
  WordTableSelectionCreateOptions,
  WordTableSelectionMode
} from "./types";

type WordTableSelectionResolver = (
  doc: PMNode,
  options: WordTableSelectionCreateOptions
) => Selection;

/** Bookmark used to map structural Word table selections through history. */
export class WordTableSelectionBookmark implements SelectionBookmark {
  readonly tablePos: number;
  readonly anchorCellPos: number;
  readonly headCellPos: number;
  readonly invalid: boolean;

  private readonly mode: WordTableSelectionMode;
  private readonly resolveSelection: WordTableSelectionResolver;

  /**
   * Creates a document-independent Word table selection bookmark.
   *
   * @param data - Bookmark state.
   * @param resolveSelection - Callback that resolves a live table selection.
   */
  constructor(
    data: WordTableSelectionBookmarkState,
    resolveSelection: WordTableSelectionResolver
  ) {
    this.tablePos = data.tablePos;
    this.anchorCellPos = data.anchorCellPos;
    this.headCellPos = data.headCellPos;
    this.mode = data.mode;
    this.invalid = data.invalid;
    this.resolveSelection = resolveSelection;
  }

  /**
   * Maps this bookmark through document changes.
   *
   * @param mapping - Mapping to apply.
   * @returns Mapped Word table selection bookmark.
   */
  map(mapping: Mappable): SelectionBookmark {
    const tableResult = mapping.mapResult(this.tablePos, 1);
    const anchorResult = mapping.mapResult(
      this.tablePos + this.anchorCellPos,
      1
    );
    const headResult = mapping.mapResult(this.tablePos + this.headCellPos, 1);
    const invalid = this.invalid ||
      tableResult.deleted ||
      anchorResult.deleted ||
      headResult.deleted;

    return new WordTableSelectionBookmark({
      tablePos: tableResult.pos,
      anchorCellPos: Math.max(0, anchorResult.pos - tableResult.pos),
      headCellPos: Math.max(0, headResult.pos - tableResult.pos),
      mode: this.mode,
      invalid
    }, this.resolveSelection);
  }

  /**
   * Resolves this bookmark against a document.
   *
   * @param doc - Document to resolve against.
   * @returns Word table selection or a nearby fallback selection.
   */
  resolve(doc: PMNode): Selection {
    if (this.invalid) {
      return createFallbackSelection(doc, this.tablePos);
    }

    try {
      return this.resolveSelection(doc, {
        tablePos: this.tablePos,
        anchorCellPos: this.anchorCellPos,
        headCellPos: this.headCellPos,
        mode: this.mode
      });
    } catch {
      return createFallbackSelection(doc, this.tablePos);
    }
  }
}
