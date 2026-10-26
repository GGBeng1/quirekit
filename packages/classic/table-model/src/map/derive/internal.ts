import type { Node as PMNode } from "@quirekit/pm";
import type {
  WordTableCellRole,
  WordTableExplicitCellRef,
  WordTableGridRange,
  WordTableGridSlot,
  WordTableMapDiagnostic,
  WordTableSemanticCellRef
} from "../types";

export type MutableExplicitCellRef = Omit<
  WordTableExplicitCellRef,
  "role" | "semanticCellId"
> & {
  role: WordTableCellRole;
  semanticCellId: string | null;
};

export type MutableSemanticCellRef = Omit<
  WordTableSemanticCellRef,
  "continuationExplicitCellIds" | "rect" | "rowSpan" | "wellFormed"
> & {
  continuationExplicitCellIds: string[];
  rect: WordTableSemanticCellRef["rect"];
  wellFormed: boolean;
};

export type OpenVerticalMergeChain = {
  key: string;
  range: WordTableGridRange;
  semanticCellId: string;
  originIsHeader: boolean;
};

export type CreateExplicitCellRefOptions = {
  readonly rowId: string;
  readonly rowIndex: number;
  readonly cellIndex: number;
  readonly cellPos: number;
  readonly startColumn: number;
  readonly cellNode: PMNode;
  readonly diagnostics: WordTableMapDiagnostic[];
};

export type SemanticResolutionOptions = {
  readonly explicitCell: MutableExplicitCellRef;
  readonly rowIsHeader: boolean;
  readonly semanticCells: MutableSemanticCellRef[];
  readonly semanticById: Map<string, MutableSemanticCellRef>;
  readonly openChains: Map<string, OpenVerticalMergeChain>;
  readonly diagnostics: WordTableMapDiagnostic[];
};

export type RowSlotMap = Map<number, WordTableGridSlot>;
