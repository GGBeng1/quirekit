import type { DataField, DataSet, DataView } from "@quirekit/data-view";

/** Immutable source and real entry captured for one schema-editing task. */
export interface FieldTask {
  /** Remount identity for an independently owned form draft. */ readonly key: number;
  /** Dataset version read when the task opened. */ readonly data: DataSet;
  /** Existing field, or undefined for creation. */ readonly field: DataField | undefined;
  /** View whose display order receives a newly created field. */ readonly viewId: string;
  /** Actual entry that remains mounted after its menu closes. */ readonly anchor: HTMLElement;
}

/** Reactive host dependencies; no document subscriptions or geometry polling. */
export interface FieldTaskOptions {
  /** @returns Current complete dataset, if available. */ readonly data: () => DataSet | null;
  /** @returns Current displayed projection. */ readonly view: () => DataView;
  /** @returns Whether schema editing is prohibited. */ readonly readOnly: () => boolean;
  /** @returns Whether the host is saving. */ readonly busy: () => boolean;
  /** @returns Mounted workspace owning all fallback focus entries. */ readonly owner: () => HTMLElement | null;
}

/** Public-control composition for a single transient schema form. */
export interface FieldEditorProps {
  /** Schema captured at opening. */ readonly data: DataSet;
  /** Existing field, absent for creation. */ readonly field?: DataField | undefined;
  /** Controlled task visibility. */ readonly open: boolean;
  /** Host commit acknowledgement in progress. */ readonly busy: boolean;
  /** Validation or persistence failure, retained with the draft. */ readonly error: string;
  /** @returns Actual owner-local positioning entry. */ readonly anchorEl: () => HTMLElement | null;
  /** @returns Surviving entry to receive focus after exit. */ readonly finalFocusEl: () => HTMLElement | null;
}
