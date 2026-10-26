import type { MindMapEditorCommand } from "@quirekit/mind-map-simple";
import type { MindMapHarness } from "./types";

/** @param message - Loading, editing or failure message to announce. */
function setStatus(message: string): void {
  document.getElementById("preview-status")!.textContent = message;
}

/** @param error - Mount or interaction failure; never leave a silent blank surface. */
export function reportPreviewError(error: unknown): void {
  setStatus(`预览运行失败：${error instanceof Error ? error.message : String(error)}`);
}

/**
 * Starts a disposable manual preview using the same public API as regression tests.
 * @param harness - Fixture instances and deterministic source documents.
 * @returns Completion of mounting both maps and enabling the controls.
 */
export async function initializePreview(harness: MindMapHarness): Promise<void> {
  const index = await harness.mount(21, "first", {
    label: "可编辑思维导图",
    /** @param value - Data invalidation count from the primary instance. */
    onChange(value) {
      harness.notifications[0] = value;
      setStatus("已修改 · 仅保留在当前页面，刷新会重置。");
    },
    onError: reportPreviewError,
  });
  await harness.mount(5, "second", { label: "独立思维导图实例", onError: reportPreviewError });
  const editor = harness.editors[index]!;
  const toolbar = document.getElementById("preview-toolbar")!;
  const buttons = [...toolbar.querySelectorAll<HTMLButtonElement>("button[data-command]")];

  // Toolbar gestures belong to this editor. Keep its selected node and prevent the
  // vendor's outer-click handler from closing an edit overlay just opened here.
  toolbar.addEventListener("pointerdown", event => { event.preventDefault(); event.stopPropagation(); });
  toolbar.addEventListener("mousedown", event => event.stopPropagation());
  toolbar.addEventListener("click", event => event.stopPropagation());
  for (const button of buttons) {
    button.disabled = false;
    button.addEventListener("click", () => {
      const command = button.dataset.command as MindMapEditorCommand;
      buttons.forEach(item => { item.disabled = true; });
      void editor.execute(command).then(() => {
        if (command !== "edit-text") {
          document.querySelector<HTMLElement>("#first [data-quirekit-mind-map]")!.focus({ preventScroll: true });
        }
      }).catch(reportPreviewError).finally(() => {
        buttons.forEach(item => { item.disabled = false; });
      });
    });
  }
  editor.select("n0");
  setStatus("可以开始编辑 · 已选中中心主题，点击“新增子主题”或按 Tab。");
}
