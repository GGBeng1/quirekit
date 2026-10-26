import type { SourceAnchor, SourceBlockControls, SourceBlockSide, SourceInsertionControls } from "@quirekit/msfe-core";
import type { QuireKitCommandListItem } from "@quirekit/ui/vue";

/** Search projection of a shared insertion action. */
export interface MdBlockInsertionSearchItem extends QuireKitCommandListItem {
  /** Icon from the original insertion catalog. */ readonly icon?: string | undefined;
}

/** Source intent captured by an in-document command, without drag-handle state. */
export type MdBlockReplacementControls = Pick<SourceBlockControls, "editor" | "target" | "block" | "rect">;

/** Complete source block captured by either a rail or a toolbar menu. */
export type MdBlockInsertionControls = Pick<SourceBlockControls, "editor" | "target" | "block">;

/** Explicit source destination: beside a block, at a blank line, or replacing a complete trigger block. */
export type MdBlockInsertionTarget = {
  /** Captured block controls. */ readonly controls: MdBlockInsertionControls;
  /** Boundary beside the complete block. */ readonly side: SourceBlockSide;
} | {
  /** Captured empty-line controls. */ readonly controls: SourceInsertionControls;
  /** Replace this line instead of inserting beside another block. */ readonly side: "at";
} | {
  /** Captured complete trigger block. */ readonly controls: MdBlockReplacementControls;
  /** Replace the trigger and its query in one transaction. */ readonly side: "replace";
};

/** Deferred insertion captured before a block menu closes. */
export type MdBlockInsertionRequest = MdBlockInsertionTarget & {
  /** Installed insertion capability selected by the user. */ readonly value: string;
};

/** Source ownership shared by all parameterized block and empty-line insertions. */
export interface MdBlockInsertionWriter {
  /** Mapped original block or blank line, invalidated when touched or removed. */ readonly anchor: SourceAnchor;
  /** @param source - Complete canonical Markdown payload. @returns Whether the single atomic insertion succeeded. */
  commit(source: string): boolean;
  /** Releases the draft without creating source content. */ release(): void;
}

/** Menu-owned complete block, retained independently of the live caret. */
export interface MdAdjacentInsertion {
  /** Original syntax owner, used only for product labels. */ readonly name: string;
  /** @param side - Explicit user-selected sibling boundary. @returns Current original destination, or null after invalidation. */
  target(side: SourceBlockSide): Extract<MdBlockInsertionTarget, { side: SourceBlockSide }> | null;
  /** Releases the captured menu intent. */ release(): void;
}
