import type { MsfeEditor, MsfeEditorOptions, MsfeNodeViewProps } from "@quirekit/msfe-core";

/** Initial editor options, applied when the component mounts. */
export type ReactEditorOptions = Omit<MsfeEditorOptions, "parent" | "componentHost">;

/** Props for a React component hosted by a source-bound view. */
export interface ReactNodeViewComponentProps<Attrs extends object, Resource = unknown> {
  /** Canonical source fields and guarded actions. */
  readonly nodeView: MsfeNodeViewProps<Attrs, Resource>;
}

/** Complete React mount component configuration. */
export interface ReactEditorContentProps {
  /** Initial options; use editor methods to change content, mode or theme. */
  readonly options: ReactEditorOptions;
  /** Optional CSS class for the editor mount. */
  readonly className?: string;
  /** Optional accessible DOM identity for the mount. */
  readonly id?: string;
  /** Called after each mount, including StrictMode's development lifecycle replay. */
  readonly onReady?: (editor: MsfeEditor) => void;
}
