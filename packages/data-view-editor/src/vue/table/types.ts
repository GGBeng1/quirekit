import type { DataValue } from "@quirekit/data-view";

/** Exact acceptance of one cell mutation. */
export interface CellWriteReceipt {
  /** Source identity, independent of sort position. */ readonly recordId: string;
  /** Source field identity. */ readonly fieldId: string;
  /** Complete source value expected after the host receipt. */ readonly value: DataValue;
  /** Exact host or draft acceptance, independent of coincidentally equal source text. */ readonly receipt: Promise<boolean>;
}
/** One acknowledged focus transition between stable table cells. */
export interface PendingCellMove extends CellWriteReceipt {
  /** Neighbor identity captured before the change. */ readonly targetRecordId: string;
  /** Neighbor column identity. */ readonly targetFieldId: string;
}
/** Temporary width preview, never a document change. */
export interface ColumnWidthPreview {
  /** Existing table field. */ readonly fieldId: string;
  /** CSS pixel width from the latest pointer point. */ readonly width: number;
}
