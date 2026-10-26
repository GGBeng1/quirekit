import type { DataViewInlineProps } from "@quirekit/data-view-editor";
import type { Node as PMNode } from "@quirekit/pm";

/** Controlled props for one retained inline data object. */
export interface BlockDataViewSnapshot extends Omit<DataViewInlineProps, "value"> {
  /** Parsed canonical data, or null for an unsupported envelope. */
  readonly value: DataViewInlineProps["value"] | null;
}

/** Framework-neutral node view; Vue owns only its controlled inner component. */
export interface BlockDataViewSurface {
  /** Stable Teleport destination and document object boundary. */
  readonly dom: HTMLElement;
  /** Reads controlled props without parsing or serializing. @returns Current source and actions. */
  snapshot(): BlockDataViewSnapshot;
  /** Accepts the latest canonical atom. @param node - Retained document node. @returns Whether identity survives. */
  update(node: PMNode): boolean;
  /** Synchronizes permission without reprocessing the dataset. */
  syncEditable(): void;
  /** Leaves inner widgets in charge of their events. @param event - Native input. @returns Whether the document should ignore it. */
  stopEvent(event: Event): boolean;
  /** Ignores framework DOM changes. @returns Always true for this opaque atom. */
  ignoreMutation(): boolean;
  /** Revokes callbacks before detaching the framework component. */
  destroy(): void;
}
