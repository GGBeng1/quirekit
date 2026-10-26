import type { QuireKitMenuEntry } from "@quirekit/ui";
import type { BlockCodeDisplay } from "./types";

/** @param display - Canonical settings. @returns Shared header/menu presentation choices. */
export function codeDisplayOptions(display: BlockCodeDisplay): readonly QuireKitMenuEntry[] {
  return [
    { value: "numbers", label: "显示行号", icon: "listNumbered", checked: display.lineNumbers },
    { value: "wrap", label: "自动换行", icon: "wrapText", checked: display.wrap },
    { value: "height", kind: "submenu", label: "代码高度", icon: "panelTop", children: [
      { value: "height:0", label: "随内容展开", checked: display.height === null },
      ...[160, 240, 400].map(height => ({ value: `height:${height}`, label: `${height} px`, checked: display.height === height }))
    ] },
    { value: "theme", kind: "submenu", label: "代码主题", icon: "fillColor", children: [
      { value: "theme:auto", label: "跟随文档", checked: display.theme === "auto" },
      { value: "theme:light", label: "浅色", checked: display.theme === "light" },
      { value: "theme:dark", label: "深色", checked: display.theme === "dark" }
    ] }
  ];
}
/** @param value - Public menu action. @param current - Captured settings. @returns Canonical patch or null for a non-action. */
export function codeDisplayPatch(value: string, current: BlockCodeDisplay): Partial<BlockCodeDisplay> | null {
  if (value === "numbers") return { lineNumbers: !current.lineNumbers };
  if (value === "wrap") return { wrap: !current.wrap };
  if (["height:0", "height:160", "height:240", "height:400"].includes(value)) return { height: Number(value.slice(7)) || null };
  if (["theme:auto", "theme:light", "theme:dark"].includes(value)) return { theme: value.slice(6) as BlockCodeDisplay["theme"] };
  return null;
}
