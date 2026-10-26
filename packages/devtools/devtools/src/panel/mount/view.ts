import { createCopyFeedback } from "./copy-feedback";
import { renderLauncherStatus } from "../chrome";
import { createMountRoot, getOwnerDocument, isElement, isEventTarget, removeMountRoot } from "./dom";
import { createPanelDragController } from "./drag";
import { capturePanelScrollState, restorePanelScrollState } from "./scroll";
import { copyDocumentJson, exportPanelData as runExportPanelData } from "../export/action";
import { defaultExportTopCount } from "../export";
import { focusJsonSearch, readExportScope, readPanelAction, readTab, type QuireDevtoolsPanelAction } from "../interaction";
import { collectAllJsonExpandedPaths, toggleExpandedInteraction, toggleExpandedTimelineEntry, toggleJsonExpandedPath } from "./panel-state";
import { renderQuireDevtoolsPanelHtml } from "../render";
import { seedJsonExpansion } from "../snapshot";
import {
  isEntryToggleKey,
  isPanelCloseKey,
  isPanelToggleShortcut,
  readExportTopCountInput,
  readTimelineSlowOnlyInput
} from "./view-events";
import type { QuireDevtoolsPanelTab } from "../types";
import type { QuireDevtools, QuireDevtoolsMount } from "../../types";

export { renderQuireDevtoolsPanelHtml } from "../render";

/**
 * Mounts the framework-neutral QuireKit devtools panel into a host element.
 *
 * @param devtools - Devtools instance to read and subscribe to.
 * @param element - Host element that receives the panel mount root.
 * @returns Mounted panel handle.
 */
export function mountQuireDevtoolsPanel(devtools: QuireDevtools, element: HTMLElement): QuireDevtoolsMount {
  const root = createMountRoot(element);
  const ownerDocument = getOwnerDocument(element);
  let open = false;
  let fullscreen = false;
  let activeTab: QuireDevtoolsPanelTab = "document";
  let jsonSearch = "";
  let jsonExpandedPaths = seedJsonExpansion(devtools);
  let exportTopCount = defaultExportTopCount;
  let timelineSlowOnly = false;
  const expandedInteractionIds = new Set<number>();
  const expandedTimelineEntryIds = new Set<number>();
  const copyFeedback = createCopyFeedback(() => render());
  const panelDrag = createPanelDragController({ ownerDocument, root });

  const render = () => {
    const scrollState = capturePanelScrollState(root);
    root.innerHTML = renderQuireDevtoolsPanelHtml(devtools, {
      activeTab,
      copyState: copyFeedback.state,
      expandedInteractionIds: [...expandedInteractionIds],
      expandedTimelineEntryIds: [...expandedTimelineEntryIds],
      exportTopCount,
      fullscreen,
      jsonExpandedPaths: [...jsonExpandedPaths],
      jsonSearch,
      open,
      panelOffset: panelDrag.offset,
      timelineSlowOnly
    });
    restorePanelScrollState(root, scrollState);
  };
  const onClick = (event: Event) => {
    const target = event.target;
    const action = readPanelAction(target);

    if (!action) {
      return;
    }

    handlePanelAction(action, target);
  };
  const onInput = (event: Event) => {
    if (!isElement(event.target)) {
      return;
    }

    if (event.target.matches("[data-qk-devtools-json-search]")) {
      jsonSearch = (event.target as HTMLInputElement).value;
      render();
      focusJsonSearch(root, jsonSearch.length);
      return;
    }

    const nextTimelineSlowOnly = readTimelineSlowOnlyInput(event.target);
    if (nextTimelineSlowOnly !== undefined) {
      timelineSlowOnly = nextTimelineSlowOnly;
      render();
      return;
    }

    const nextExportTopCount = readExportTopCountInput(event.target);
    if (nextExportTopCount !== undefined) {
      exportTopCount = nextExportTopCount;
    }
  };
  const onPointerDown = (event: Event) => {
    if (fullscreen) {
      return;
    }
    panelDrag.handlePointerDown(event);
  };
  const onKeydown = (event: Event) => {
    const keyboardEvent = event as KeyboardEvent;
    const action = readPanelAction(keyboardEvent.target);

    if (isEntryToggleKey(keyboardEvent, action)) {
      keyboardEvent.preventDefault();
      handlePanelAction(action, keyboardEvent.target);
      return;
    }

    if (isPanelToggleShortcut(keyboardEvent)) {
      keyboardEvent.preventDefault();
      open = !open;
      render();
      return;
    }

    if (!isPanelCloseKey(keyboardEvent, open)) {
      return;
    }

    open = false;
    render();
  };
  const subscription = devtools.subscribe(() => {
    if (open) {
      render();
      return;
    }

    // Keep the launcher truthful without serializing snapshots or rebuilding
    // hidden timeline DOM on the synchronous transaction/render path.
    refreshLauncherStatus(root, renderLauncherStatus(devtools.getEntries()));
  });

  /**
   * Handles delegated click actions.
   *
   * @param action - Panel action.
   * @param target - Original event target.
   */
  function handlePanelAction(
    action: QuireDevtoolsPanelAction,
    target: EventTarget | null
  ): void {
    if (action === "toggle" || action === "close") {
      open = action === "toggle" ? !open : false;
      render();
      return;
    }

    if (action === "clear") {
      devtools.clear();
      render();
      return;
    }

    if (action === "interaction-toggle") {
      toggleExpandedInteraction(expandedInteractionIds, target);
      render();
      return;
    }

    if (action === "timeline-toggle") {
      toggleExpandedTimelineEntry(expandedTimelineEntryIds, target);
      render();
      return;
    }

    if (action === "fullscreen-toggle") {
      fullscreen = !fullscreen;
      render();
      return;
    }

    if (action === "export") {
      void exportSelectedPanelData(target);
      return;
    }

    if (action === "tab") {
      activeTab = readTab(target) ?? activeTab;
      render();
      return;
    }

    if (action === "json-toggle") {
      toggleJsonExpandedPath(jsonExpandedPaths, target);
      render();
      return;
    }

    if (action === "json-expand-all") {
      jsonExpandedPaths = collectAllJsonExpandedPaths(devtools);
      render();
      return;
    }

    if (action === "json-collapse-all") {
      jsonExpandedPaths = new Set<string>();
      render();
      return;
    }

    void copyDocumentJson(devtools, copyFeedback.copy);
  }

  /**
   * Exports selected devtools data.
   *
   * @param target - Original event target.
   */
  async function exportSelectedPanelData(target: EventTarget | null): Promise<void> {
    const scope = readExportScope(target) ?? "recent";
    await runExportPanelData({
      copyText: copyFeedback.copy,
      devtools,
      ownerDocument,
      scope,
      topCount: exportTopCount
    });
  }

  if (isEventTarget(root)) {
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
    root.addEventListener("pointerdown", onPointerDown);
  }
  if (isEventTarget(ownerDocument)) {
    ownerDocument.addEventListener("keydown", onKeydown);
  }
  render();

  return {
    destroy: () => {
      subscription.unsubscribe();
      copyFeedback.destroy();
      panelDrag.destroy();
      if (isEventTarget(root)) {
        root.removeEventListener("click", onClick);
        root.removeEventListener("input", onInput);
        root.removeEventListener("pointerdown", onPointerDown);
      }
      if (isEventTarget(ownerDocument)) {
        ownerDocument.removeEventListener("keydown", onKeydown);
      }
      removeMountRoot(element, root);
    }
  };
}

/**
 * Updates only the closed launcher's lightweight count label.
 *
 * @param root - Devtools mount root containing the launcher.
 * @param status - Preformatted recorder status.
 */
function refreshLauncherStatus(root: HTMLElement, status: string): void {
  const count = root.querySelector<HTMLElement>(".qk-devtools-launcher__count");

  if (count) {
    count.textContent = status;
  }
}
