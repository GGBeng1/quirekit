import type { QuireMountedEditorViewOptions } from "@quirekit/core";
import type { Transaction } from "@quirekit/pm";
import type { DirectEditorProps } from "@quirekit/pm-view";
import type { DomViewProps, DomViewRenderers } from "./types";

/**
 * Composes native props while preserving Core's state and dispatch authority.
 * @param mount - Shared editor and surface status.
 * @param local - View-local prop overrides.
 * @param renderers - Stable extension DOM renderer maps.
 * @param dispatch - Adapter-owned transaction bridge.
 * @returns Complete props for a native EditorView update.
 */
export function createDomProps(
  mount: QuireMountedEditorViewOptions,
  local: DomViewProps,
  renderers: DomViewRenderers,
  dispatch: (transaction: Transaction) => void
): DirectEditorProps {
  const { editor, status } = mount;
  const props = { ...editor.editorProps, ...local } as DomViewProps;
  const transformPastedHTML = editor.extensionManager.transformPastedHTML(
    editor,
    props.transformPastedHTML as ((html: string, view?: unknown) => string) | undefined
  );
  return {
    ...props,
    state: editor.state.pm,
    dispatchTransaction: dispatch,
    nodeViews: { ...renderers.nodeViews, ...props.nodeViews },
    markViews: { ...renderers.markViews, ...props.markViews },
    editable: state => status !== "lock" && editor.isEditable && props.editable?.(state) !== false,
    attributes: state => ({
      role: "textbox",
      "aria-multiline": "true",
      ...(typeof props.attributes === "function" ? props.attributes(state) : props.attributes)
    }),
    ...(transformPastedHTML ? { transformPastedHTML } : {})
  };
}
