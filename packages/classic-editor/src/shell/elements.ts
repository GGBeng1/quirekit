import { createClassicMobileShell } from "./mobile/layout";
import { nextTick, shallowReactive } from "vue";
import type {
  ClassicEditorLocale,
  ClassicEditorRenderContext,
  ClassicEditorRulerController,
  ClassicEditorRulerContribution,
  ClassicEditorShellOptions,
  QuireKitTheme,
  ClassicEditorViewBackend
} from "../types";
import ClassicEditorShell from "./components/classic-editor-shell.vue";
import { renderClassicEditorShell } from "./render";
import { destroyRenderedSidebars } from "./contribution/panels";
import { destroyRenderedStatus } from "./contribution/status";
import { isClassicEditorContributionVisible } from "./contribution/visibility";
import { createClassicEditorStageController } from "./stage/controller";
import type { ClassicEditorFitZoomListener } from "./stage/types";
import type {
  ClassicEditorShellElements,
  ClassicEditorShellModel
} from "./types";
import { createClassicEditorUiApp } from "./vue-app";

/**
 * Creates the Vue product shell while leaving the editor model and View runtime framework-neutral.
 *
 * @param host - Consumer mount element.
 * @param options - Resolved shell visibility and initial state.
 * @param locale - Resolved product-interface locale.
 * @param backend - Active rendering backend.
 * @param theme - Resolved product theme shared with private UI controls.
 * @param onFitZoom - Optional runtime receiver of automatic reading percentages.
 * @returns Product-owned DOM elements and lifecycle.
 */
export function createClassicEditorShell(
  host: HTMLElement,
  options: Required<ClassicEditorShellOptions>,
  locale: ClassicEditorLocale,
  backend: ClassicEditorViewBackend,
  theme: QuireKitTheme,
  onFitZoom: ClassicEditorFitZoomListener = () => {}
): ClassicEditorShellElements {
  const mountHost = host.ownerDocument.createElement("div");
  mountHost.className = "qk-classic-editor__vue-host";
  host.append(mountHost);
  const model = shallowReactive<ClassicEditorShellModel>({
    context: undefined,
    locale,
    backend,
    theme,
    options
  });
  const app = createClassicEditorUiApp(
    ClassicEditorShell,
    { model },
    { theme: () => model.theme, locale: () => model.context?.locale ?? model.locale }
  );
  app.mount(mountHost);

  const root = requireElement(mountHost, ".qk-classic-editor");
  const elements = {
    root,
    header: requireElement(root, ".qk-classic-editor__header"),
    menuBar: requireElement(root, ".qk-classic-editor__menu-bar"),
    toolbar: requireElement(root, ".qk-classic-editor__quick-actions"),
    ribbonTabs: requireElement(root, ".qk-classic-editor__ribbon-tabs"),
    commandSurface: requireElement(root, "[data-command-renderer]"),
    ruler: requireElement(root, ".qk-classic-editor__ruler"),
    workspaceToolbar: requireElement(root, ".qk-classic-editor__workspace-toolbar"),
    leftSidebar: requireElement(root, ".qk-classic-editor__sidebar--left"),
    workspaceViewport: requireElement(root, ".qk-classic-editor__workspace-viewport"),
    documentScrollContent: requireElement(
      root,
      ".qk-classic-editor__document-scroll-content"
    ),
    canvasMount: requireElement(root, ".qk-classic-editor__canvas-mount"),
    documentOverlayHost: requireElement(
      root,
      "[data-qk-classic-document-overlays]"
    ),
    rightSidebar: requireElement(root, ".qk-classic-editor__sidebar--right"),
    documentSidebar: requireElement(root, ".qk-classic-editor__document-sidebar"),
    statusBar: requireElement(root, ".qk-classic-editor__status-items")
  };
  elements.leftSidebar.hidden = !options.leftSidebar;
  elements.rightSidebar.hidden = !options.rightSidebar;
  root.dataset.leftSidebar = options.leftSidebar ? "open" : "closed";
  root.dataset.rightSidebar = options.rightSidebar ? "open" : "closed";
  root.dataset.rightSidebarScrollOwner = "panel";

  let rulerId: string | undefined;
  let rulerController: ClassicEditorRulerController | undefined;
  const stage = createClassicEditorStageController(elements, onFitZoom);
  model.containsPagePoint = stage.containsPagePoint;
  const mobile = createClassicMobileShell({ elements, model, stage });

  /** Reconciles the single active interactive ruler contribution. */
  function updateRuler(context: ClassicEditorRenderContext): void {
    const contribution = context.instance.registry.contributions.find(
      (item): item is ClassicEditorRulerContribution =>
        item.kind === "ruler"
        && isClassicEditorContributionVisible(item, context)
    );
    if (contribution?.id === rulerId && rulerController) {
      rulerController.update?.(context);
      return;
    }
    rulerController?.destroy();
    rulerController = undefined;
    rulerId = contribution?.id;
    elements.ruler.replaceChildren();
    if (contribution) {
      rulerController = contribution.mount({
        ...context,
        host: elements.ruler,
        workspaceViewport: elements.workspaceViewport,
        viewMount: elements.canvasMount,
        readPageRect: stage.readPageRect
      });
    }
  }

  return {
    ...elements,
    updateDocumentLayout: stage.setDocumentLayout,
    update(context) {
      model.context = context;
      model.locale = context.locale;
      if (context.theme) model.theme = context.theme;
      mobile.update(context);
      const ui = context.ui.state;
      elements.leftSidebar.hidden = !ui.leftSidebar.visible;
      root.dataset.leftSidebar = ui.leftSidebar.visible ? "open" : "closed";
      root.dataset.rightSidebar = ui.rightSidebar.visible ? "open" : "closed";
      root.dataset.leftPanel = ui.leftSidebar.activePanelId ?? "";
      root.dataset.rightPanel = ui.rightSidebar.activePanelId ?? "";
      renderClassicEditorShell(elements, context);
      updateRuler(context);
      stage.setZoom(ui.zoom, ui.zoomMode);
      void nextTick(stage.schedule);
    },
    destroy() {
      mobile.destroy();
      stage.destroy();
      rulerController?.destroy();
      rulerController = undefined;
      destroyRenderedSidebars(elements);
      destroyRenderedStatus(elements.statusBar);
      app.unmount();
      mountHost.remove();
    }
  };
}

/**
 * Requires one stable shell region created by the private Vue component.
 *
 * @param root - Shell or Vue host to query.
 * @param selector - Required region selector.
 * @returns Matching HTML element.
 */
function requireElement(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Classic Editor shell is missing ${selector}.`);
  return element;
}
