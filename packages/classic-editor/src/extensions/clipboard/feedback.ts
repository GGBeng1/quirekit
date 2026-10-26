import type { ClassicEditorRenderContext } from "@classic/types";
import type { ClassicEditorClipboardOperation } from "./types";

const messages: Record<ClassicEditorClipboardOperation, readonly [zh: string, en: string]> = {
  copy: ["浏览器未允许从菜单写入剪贴板，请按 {mod}+C 复制。", "The browser blocked menu access to the clipboard. Press {mod}+C to copy."],
  cut: ["浏览器未允许从菜单写入剪贴板，内容未剪切。请按 {mod}+X 剪切。", "The browser blocked menu access to the clipboard; nothing was cut. Press {mod}+X to cut."],
  paste: ["浏览器未允许从菜单读取剪贴板，请按 {mod}+V 粘贴（{mod}+Shift+V 只粘贴文本）。", "The browser blocked menu access to the clipboard. Press {mod}+V to paste ({mod}+Shift+V for text only)."],
  "paste-text": ["浏览器未允许从菜单读取剪贴板，请按 {mod}+Shift+V 只粘贴文本。", "The browser blocked menu access to the clipboard. Press {mod}+Shift+V to paste text only."]
};

/**
 * Shows a shared toast explaining a refused menu clipboard operation.
 *
 * @param context - Mounted product context owning the task surface.
 * @param operation - Operation the browser refused.
 */
export function reportClassicEditorClipboardBlocked(
  context: ClassicEditorRenderContext,
  operation: ClassicEditorClipboardOperation
): void {
  const zh = context.locale === "zh-CN";
  const platform = context.root.ownerDocument.defaultView?.navigator.platform ?? "";
  const mod = /Mac|iPhone|iPad/.test(platform) ? "⌘" : "Ctrl";
  const message = messages[operation][zh ? 0 : 1].replaceAll("{mod}", mod);
  const reading = operation === "paste" || operation === "paste-text";
  const handle = context.instance.tasks.startTask({
    taskId: "classic-clipboard-menu",
    kind: reading ? "import" : "export",
    phase: "processing",
    label: zh ? (reading ? "无法读取剪贴板" : "无法写入剪贴板") : (reading ? "Clipboard unavailable" : "Clipboard write blocked")
  });
  context.instance.tasks.update(handle, {
    phase: "error",
    diagnostics: [{ code: "clipboard-permission-denied", message, retryable: false }]
  });
}
