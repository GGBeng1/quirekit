import type { EditorSelection } from "@quirekit/cm-state";
import type { MsfeMode } from "../../state/types";
import type { EditorView } from "@quirekit/cm-view";
import type { SourceClientPoint } from "../geometry/types";

/** Optional isolated input policy; document state and history remain CodeMirror-owned. */
export interface SourceInputProxyOptions {
  /** Owner-window media condition that admits the isolated native input host. */
  readonly mediaQuery: string;
  /** Source presentations that admit the proxy; defaults to live only. */
  readonly modes?: readonly MsfeMode[];
  /** Preferred caret reveal space in client pixels, e.g. for a rendered touch grip; defaults to 8. */
  readonly revealMargin?: number;
  /** @param view - Canonical source owner. @param point - Accepted short-tap client point. @returns True when the host handles an existing selection without moving or focusing it. */
  readonly onSelectionTap?: (view: EditorView, point: SourceClientPoint) => boolean;
}

/** Nonpersistent composition text replacing the captured primary source range. */
export interface SourcePreedit {
  /** Source range captured before the first native composition mutation. */
  readonly selection: EditorSelection;
  /** Uncommitted text; never serialized or included in source history. */
  readonly text: string;
}

/** A native input owner registered for one mounted CodeMirror view. */
export interface SourceInputOwner {
  /** Invisible native keyboard host, outside the rendered content. */
  readonly input: HTMLTextAreaElement;
  /** Whether this owner currently accepts native text events. */
  readonly active: boolean;
  /** Focus the current owner without scrolling to a different source target. */
  focus(): void;
}

/** Transient input metadata, independent of the source/history/provider authority. */
export interface SourceProxyState {
  /** Whether rendered content relinquishes native editable ownership. */
  readonly active: boolean;
  /** Whether the current native keyboard host actually has focus. */
  readonly focused: boolean;
  /** Composition presentation, absent outside an active preedit session. */
  readonly preedit: SourcePreedit | null;
}
