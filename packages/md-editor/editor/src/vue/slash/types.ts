import type { AnyExtension, SourceBlock } from "@quirekit/msfe-core";
import type { MdBlockReplacementControls } from "../blocks/insertion/types";

/** A bounded query occupying one complete ordinary paragraph. */
export interface MdSlashQuery {
  /** Exact paragraph and admitted sibling flow. */ readonly block: SourceBlock;
  /** Search text after the slash. */ readonly query: string;
}

/** Passive viewport snapshot; native source remains the only query state. */
export interface MdSlashSession {
  /** Versioned atomic replacement destination. */ readonly controls: MdBlockReplacementControls;
  /** Native editable element retaining keyboard/IME focus. */ readonly input: HTMLElement;
  /** Search text following the trigger. */ readonly query: string;
}

/** Product callbacks consulted only during accepted input or an active menu. */
export interface MdSlashOptions {
  /** @returns Whether the host currently permits slash interaction. */ enabled(): boolean;
  /** @param session - Measured menu state, or null on dismissal. */ change(session: MdSlashSession | null): void;
  /** @param event - Non-composing native key event. @returns Whether the visible menu handled it. */ keydown(event: KeyboardEvent): boolean;
}

/** Instance-scoped controller installed through the normal extension system. */
export interface MdSlashController {
  /** Native input, geometry and lifecycle observers. */ readonly extension: AnyExtension;
  /** Close without changing source or moving focus. */ dismiss(): void;
}
