import type { Editor } from "@quirekit/core";
import type { BlockOutlineEntry } from "../state/types";

/** Dependencies of the visible reading outline, borrowed from the product shell. */
export interface ReadingOutlineOptions {
  /** Canonical editor, used only for public geometry and explicit navigation. */
  readonly editor: Editor;
  /** Product-owned document scroll container. */
  readonly viewport: HTMLElement;
  /** @returns Incrementally maintained semantic headings in document order. */
  readonly headings: () => readonly BlockOutlineEntry[];
  /** @param pos - Heading corresponding to the actual viewport, or no visible headings. */
  readonly activate: (pos: number | undefined) => void;
}

/** Reading-only subscriptions, released when the outline is not visible. */
export interface ReadingOutlineController {
  /** Invalidates retained heading anchors after the semantic projection changes. */
  refresh(): void;
  /** @param pos - Heading to reveal at the reading line after its geometry commits. */
  navigate(pos: number): void;
  /** Releases subscriptions and cancels pending measurements. */
  destroy(): void;
}

/** Public retained heading DOM, with no document geometry cached across scrolling. */
export interface ReadingHeadingAnchor {
  /** Current canonical heading position. */
  readonly pos: number;
  /** Visible retained heading element. */
  readonly element: Element;
}
