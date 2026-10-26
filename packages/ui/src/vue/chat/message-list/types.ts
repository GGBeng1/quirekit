import type { Ref } from 'vue';
import type { QuireKitChatMessageListHandle } from '../../../components/chat';

/** An item position in the viewport's physical Y coordinate space. */
export interface ReadingAnchor {
  /** Stable host-owned identity. */
  readonly key: string;
  /** Item top relative to viewport top, possibly negative. */
  readonly offset: number;
}

/** Reactive inputs to the scroll policy; the ScrollArea owns the native viewport. */
export interface MessageListScrollOptions {
  /** Public ScrollArea viewport getter. */
  readonly viewport: () => HTMLElement | null;
  /** Content whose geometry may change after media or streaming updates. */
  readonly content: Ref<HTMLElement | undefined>;
  /** Ordered host keys. */
  readonly keys: () => readonly string[];
  /** Session identity, not a persisted scroll-position key. */
  readonly session: () => string;
  /** Report a transition, not every scroll frame. */
  readonly onFollowingChange: (value: boolean) => void;
}

/** Internal commands and reactive state for the composition shell. */
export interface MessageListScrollController extends QuireKitChatMessageListHandle {
  /** Whether new geometry should keep the viewport at its end. */
  readonly following: Ref<boolean>;
  /** Item elements updated by Vue template refs. */
  readonly nodes: Map<string, HTMLElement>;
  /** Native viewport scroll handler. */
  readonly onScroll: () => void;
}
