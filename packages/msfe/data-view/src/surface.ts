import type { ComponentViewRenderer, MsfeEditor } from "@quirekit/msfe-core";
import type { MsfeDataViewPreview, MsfeDataViewSurface } from "./types";
import { captureMsfeDataViewTarget } from "./target";

/** Binds a retained component to exact source commits without a second document model.
 * @param getEditor - Editor resolved only after mounting, on explicit user actions.
 * @param render - Host renderer using the existing provider tree.
 * @returns Renderer whose current range follows incremental source mapping.
 */
export function dataViewSurface(getEditor: () => MsfeEditor, render: ComponentViewRenderer<MsfeDataViewSurface>): ComponentViewRenderer<MsfeDataViewPreview> {
  return context => {
    let current = context.props, disposed = false;
    const actions: Pick<MsfeDataViewSurface, "commit" | "undo" | "redo"> = {
      /** @param save - Complete authored edit. @returns Conditional document receipt. */
      async commit(save) {
        if (disposed || context.scope.disposed || current.readOnly) return {accepted: false, message: "此表格已关闭或切换为只读。"};
        // Acquire proof only for the edit, using the latest mapped range. A stale
        // base is rejected by the target even when the same embed still exists.
        const target = captureMsfeDataViewTarget(getEditor(), current.range, current.dataView);
        if (!target) return {accepted: false, message: "表格源码已变化，请在当前表格中重新编辑。"};
        try { return await target.commit(save); } finally { target.release(); }
      },
      /** @returns Document history acceptance. */
      undo() { return !disposed && !context.scope.disposed && !current.readOnly && getEditor().undo(); },
      /** @returns Document history acceptance. */
      redo() { return !disposed && !context.scope.disposed && !current.readOnly && getEditor().redo(); }
    };
    const handle = render({...context, props: {...current, ...actions}});
    return {
      /** @param next - Current source snapshot and mapped position. */
      update(next) { current = next; handle.update({...next, ...actions}); },
      /** @param event - Nested control event. @returns Component input ownership. */
      ignoreEvent(event) { return handle.ignoreEvent?.(event) ?? true; },
      /** Ends callbacks before releasing the component. */
      destroy() { disposed = true; handle.destroy(); }
    };
  };
}
