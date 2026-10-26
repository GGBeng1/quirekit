import type { Editor, QuireExtensionThisContext } from "@quirekit/core";
import type { BlockFact, BlockRangeRef } from "@quirekit/extensions";
import type { QuireKitMenuEntry } from "@quirekit/ui";

/** Immutable semantic target shared by every contribution in one menu. */
export interface EditorBlockMenuContext {
  /** Canonical command owner; contributions must use typed commands for writes. */
  readonly editor: Editor;
  /** Whole block captured before native focus enters the menu. */
  readonly block: BlockFact;
  /** Revision-bound structural range, never inferred from the later caret. */
  readonly range: BlockRangeRef;
}

/** Feature-owned menu anatomy with explicit callbacks, never command-name dispatch. */
export interface EditorBlockMenuItem extends Omit<QuireKitMenuEntry, "children"> {
  /** Nested groups/submenus using the same provider-local identity space. */
  readonly children?: readonly EditorBlockMenuItem[];
  /** Pure applicability check at open and activation. @returns Whether this operation is currently available. */
  readonly isEnabled?: () => boolean;
  /** Executes after restoring the captured selection. @returns False when rejected; void or true when accepted. */
  readonly run?: () => boolean | void;
}

/** One feature's contribution; returning no items means the block is not applicable. */
export interface EditorBlockMenuProvider {
  /** Unique namespace across installed extensions and mounted surfaces. */
  readonly id: string;
  /** Stable ascending presentation order; registration order breaks ties. */
  readonly order?: number;
  /** @param context - Exact menu target. @returns Applicable items without changing document or selection. */
  readonly getItems: (context: EditorBlockMenuContext) => readonly EditorBlockMenuItem[];
}

/** Prepared menu; retained callbacks become inert after its lifetime ends. */
export interface EditorBlockMenuSession {
  /** Public menu data, with provider-scoped identities and no mutable command state. */
  readonly items: readonly QuireKitMenuEntry[];
  /** @param value - Scoped leaf identity. @returns Whether the captured action was accepted. */
  execute(value: string): boolean;
  /** Revokes the session after menu dismissal. */
  dispose(): void;
}

/** Standard extension factory, including inherited options and parent contributions. */
export type EditorBlockMenuFactory<Options extends object, Storage extends object> = (
  this: QuireExtensionThisContext<Options, Storage>, context: QuireExtensionThisContext<Options, Storage>
) => readonly EditorBlockMenuProvider[];

/** Internal registration lease; removing/replacing a provider revokes old snapshots. */
export interface EditorBlockMenuLease {
  /** Immutable feature implementation. */
  readonly provider: EditorBlockMenuProvider;
  /** False after the owning mounted surface unregisters. */
  active: boolean;
}
