import type { Editor } from "@quirekit/core";
import { registerEditorBlockMenuProvider } from "@quirekit/editor-ui";
import type { BlockContainerSurface } from "../../containers/types";
import { useBlockContainerScope } from "./state";

/** @param editor - Task owner. @param surfaces - Mounted surfaces keyed by retained DOM. @returns Provider cleanup with stale-menu revocation. */
export function registerContainerMenu(editor: Editor, surfaces: ReadonlyMap<unknown, BlockContainerSurface>): () => void {
  const scope = useBlockContainerScope(editor);
  return registerEditorBlockMenuProvider(editor, { id: "container", order: 10,
    /** @param context - Exact outer container. @returns Its existing settings, presentation and unwrap actions. */
    getItems({ block }) {
      if (block.node.type.name !== "blockContainer") return [];
      const surface = surfaces.get(editor.view.nodeDOM?.(block.from));
      return [
        { value: "settings", label: "容器设置", icon: "slidersHorizontal", run: () => scope.open(block.from) },
        ...(block.node.attrs.kind === "highlight" ? [{ value: "emoji", label: "更换表情", icon: "smile", run: () => scope.open(block.from, "emoji") }] : []),
        ...(block.node.attrs.kind === "details" && surface ? [{ value: "expanded", label: surface.snapshot().expanded ? "收起内容" : "展开内容", icon: "chevronDown", run: () => surface.toggle() }] : []),
        { value: "unwrap", label: "移出容器", icon: "logOut", isEnabled: () => editor.can().unwrapBlockContainer(block.from), run: () => editor.commands.unwrapBlockContainer(block.from) }
      ];
    }
  });
}
