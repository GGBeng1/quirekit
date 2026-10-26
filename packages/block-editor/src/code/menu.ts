import type { EditorBlockMenuProvider } from "@quirekit/editor-ui";
import { blockCodeLanguages } from "./languages";
import { codeDisplay } from "./display";
import { codeDisplayOptions, codeDisplayPatch } from "./options";
import type { EditorBlockMenuItem } from "@quirekit/editor-ui";
import type { QuireKitMenuEntry } from "@quirekit/ui";

/** Source-owned code language operations shared with the mounted header. */
export const blockCodeMenu: EditorBlockMenuProvider = {
  id: "code", order: 10,
  /** @param context - Captured code node. @returns Only code-specific operations. */
  getItems({ editor, block }) {
    if (block.node.type.name !== "codeBlock") return [];
    const expected = String(block.node.attrs.language ?? "");
    const display = codeDisplay(block.node.attrs);
    /** @param entry - Shared display option. @returns Same action bound to the captured source. */
    function option(entry: QuireKitMenuEntry): EditorBlockMenuItem {
      const { children, ...item } = entry;
      return { ...item, ...(children ? { kind: "submenu" as const, children: children.map(option) } : {}),
        run: () => { const patch = codeDisplayPatch(entry.value, display); if (patch) editor.commands.setBlockCodeDisplay({ position: block.from, expected: display, patch }); } };
    }
    return [{ value: "language", label: "代码语言", icon: "codeXml", kind: "submenu", children: blockCodeLanguages(expected).map(item => ({
      ...item, checked: item.value === `language:${expected}`,
      run: () => editor.commands.setBlockCodeLanguage({ position: block.from, expected, language: item.value.slice(9) })
    })) }, ...codeDisplayOptions(display).map(option)];
  }
};
