import type { Editor } from "@quirekit/core";
import type { QuireKitMenuEntry, QuireKitToolbarEntry } from "@quirekit/ui";
import { registerEditorBlockMenuProvider, type EditorBlockMenuItem } from "@quirekit/editor-ui";
import { blockMediaToolbarItems } from "./catalog";
import { readMediaPresentation } from "../../media/presentation";

/** @param editor - Mounted owner. @param execute - Existing object toolbar executor. @returns Revocable menu contribution using the same controls. */
export function registerMediaMenu(editor: Editor, execute: (value: string) => void): () => void {
  return registerEditorBlockMenuProvider(editor, { id: "media", order: 10,
    /** @param context - Original media object. @returns Applicable object controls; no private editor or document copy. */
    getItems({ block }) {
      if (!("media" in block.node.attrs)) return [];
      const root = editor.view.nodeDOM?.(block.from) as HTMLElement | null;
      const media = readMediaPresentation(block.node.attrs.media), image = block.node.type.name === "image";
      /** @param entries - Existing toolbar children. @returns Shared menu anatomy and executable leaf closures. */
      function children(entries: readonly QuireKitMenuEntry[]): EditorBlockMenuItem[] {
        return entries.map(item => {
          const { children: nested, ...entry } = item;
          return { ...entry, label: image ? item.label : item.label.replaceAll("图片", "图形"),
            ...(nested ? { children: children(nested) } : { run: () => execute(item.value) }) };
        });
      }
      /** @param item - Existing top-level object tool. @returns The equivalent block-menu entry. */
      function project(item: QuireKitToolbarEntry): EditorBlockMenuItem {
        return { value: item.value, label: image ? item.label : item.label.replaceAll("图片", "图形"), icon: item.icon,
          disabled: item.disabled, ...(item.kind === "menu" ? { kind: "submenu", children: children(item.items ?? []) } : { run: () => execute(item.value) }) };
      }
      return blockMediaToolbarItems(image, !!media.href, !!root?.querySelector("img")?.src)
        .filter(item => item.value !== "delete").map(project);
    }
  });
}
