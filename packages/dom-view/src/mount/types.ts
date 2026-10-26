import type { QuireMountedEditorViewOptions, QuireViewAdapter } from "@quirekit/core";
import type { DirectEditorProps, MarkViewConstructor, NodeViewConstructor } from "@quirekit/pm-view";
import type { DomEditorView } from "./runtime";

/** Native view props; shared state and dispatch remain owned by Core. */
export type DomViewProps = Omit<DirectEditorProps, "state" | "dispatchTransaction">;

/** Options shared by the native DOM extension and its adapter. */
export interface DomViewOptions {
  /** View-local native props, including direct plugins and DOM renderers. */
  readonly props?: DomViewProps | undefined;
}

/** DOM interpretation of the extension manager's renderer-neutral factories. */
export interface DomViewRenderers {
  /** Stable native node renderer map, compiled once per mount. */
  readonly nodeViews: Record<string, NodeViewConstructor>;
  /** Stable native mark renderer map, compiled once per mount. */
  readonly markViews: Record<string, MarkViewConstructor>;
}

/** Adapter with a concrete native DOM return type. */
export interface DomViewAdapter extends QuireViewAdapter {
  /** Distinguishes native contenteditable from retained HTML. */
  readonly mode: "dom";
  /**
   * Mounts one native DOM surface over the owning Core state.
   * @param options - Editor, container, identity and editability status.
   * @returns Native DOM facade.
   */
  mount(options: QuireMountedEditorViewOptions): DomEditorView;
}
