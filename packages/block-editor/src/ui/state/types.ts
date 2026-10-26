import type { BlockParagraphValues } from "../../paragraph/types";
import type { Node } from "@quirekit/pm";

/** Formatting state shared by product controls. */
export interface BlockFormattingState {
  /** Optional paragraph owner projection; null when unavailable or outside scope. */
  readonly paragraph?: BlockParagraphValues | null;
  /** Complete, absent, mixed or budget-limited marks. */
  readonly marks: Readonly<Record<string, boolean | "mixed">>;
  /** Canonical underline token, none when absent, null when mixed or unknown. */
  readonly underlineStyle: string | null;
  /** Independent underline RGB; empty follows text color, null means mixed or unknown. */
  readonly underlineColor: string | null;
  /** Paragraph, heading level, or mixed block type. */
  readonly block: string;
  /** Uniform list family, mixed selection, or no list. */
  readonly list: "bullet" | "ordered" | "task" | "mixed" | null;
  /** Uniform CSS font family; empty means inherited, null means mixed or unknown. */
  readonly font: string | null;
  /** Per-script overrides, falling back to the common family. */
  readonly fonts: Readonly<Record<"latin" | "eastAsia" | "complexScript", string | null>>;
  /** Active canonical format painter. */
  readonly painter: boolean;
  /** Whether the shared formatting session contains a reusable snapshot. */
  readonly hasCopiedFormat: boolean;
  /** Uniform point size; empty means inherited, null means mixed or unknown. */
  readonly size: string | null;
  /** Uniform text color; empty inherits, null is mixed. */
  readonly color: string | null;
  /** Uniform text background; empty has no fill, null is mixed. */
  readonly background: string | null;
  /** Uniform link target, or empty. */
  readonly href: string;
  /** Number of nodes inspected for the current range. */
  readonly visited: number;
  /** Whether the selection exceeded the inspection budget. */
  readonly truncated: boolean;
}

/** One semantic outline entry, independent of renderer geometry. */
export interface BlockOutlineEntry {
  /** Current PM position before the heading. */
  readonly pos: number;
  /** Heading text used by the visible outline. */
  readonly title: string;
  /** Heading level. */
  readonly level: number;
  /** Immutable source retained to avoid rereading unchanged heading text. */
  readonly node: Node;
}
