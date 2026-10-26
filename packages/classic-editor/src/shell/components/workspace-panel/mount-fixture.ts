import { defaultTheme } from "@quirekit/ui";
import { nextTick, type App } from "vue";
import type {
  ClassicEditorContribution,
  ClassicEditorRenderContext,
  ClassicEditorWorkspaceWidgetContribution
} from "@classic/types";
import type {
  ClassicEditorWorkspacePanelContribution,
  ClassicEditorWorkspacePanelController
} from "@classic/types/workspace-panel";
import type { ClassicEditorShellModel } from "../../types";
import { createClassicEditorUiApp } from "../../vue-app";
import ClassicEditorWorkspaceWidgets from "../classic-editor-workspace-widgets.vue";

/** Mounted Workspace Panel shell integration fixture. */
export interface MountedWorkspacePanelFixture {
  /** Root-local host containing the actual Vue components. */
  readonly root: HTMLElement;
  /** Typed controller captured by plugin contribution connection. */
  readonly controller: ClassicEditorWorkspacePanelController;
  /** Typed panel contributions registered through plugin workspace widgets. */
  readonly panels: readonly ClassicEditorWorkspacePanelContribution[];
  /** Releases every mounted Vue and plugin resource. */
  readonly destroy: () => void;
}

/**
 * Mounts the actual workspace-widget bridge and unique panel host.
 *
 * @param panels - Direct typed panel definitions projected by plugin widgets.
 * @param locale - Product locale for shared chrome.
 * @returns Mounted root, captured controller, and cleanup.
 */
export async function mountWorkspacePanelFixture(
  panels: readonly ClassicEditorWorkspacePanelContribution[],
  locale: ClassicEditorRenderContext["locale"] = "zh-CN"
): Promise<MountedWorkspacePanelFixture> {
  const root = document.createElement("section");
  root.className = "qk-classic-editor";
  const host = document.createElement("div");
  root.append(host);
  document.body.append(root);
  const tasks = Object.freeze({ revision: 0, tasks: Object.freeze([]) });
  const widgetContributions = panels.map(createWorkspaceWidgetContribution);
  let capturedController: ClassicEditorWorkspacePanelController | undefined;
  const connectedPanels = panels.map((panel) => ({
    ...panel,
    connect(controller: ClassicEditorWorkspacePanelController): () => void {
      capturedController = controller;
      const cleanup = panel.connect?.(controller);
      return () => cleanup?.();
    }
  }));
  const registryContributions = widgetContributions.map((widget, index) => ({
    ...widget,
    mount(context: ClassicEditorRenderContext) {
      const mounted = widget.mount(context);
      return { ...mounted, workspacePanel: connectedPanels[index]! };
    }
  }));
  const instance = {
    registry: { contributions: registryContributions as readonly ClassicEditorContribution[] },
    tasks: {
      snapshot: tasks,
      subscribe(listener: (snapshot: typeof tasks) => void): () => void {
        listener(tasks);
        return () => undefined;
      }
    },
    hostResources: {
      snapshot: null,
      subscribe(listener: (snapshot: null) => void): () => void {
        listener(null);
        return () => undefined;
      }
    }
  };
  const context = {
    instance,
    root,
    ownerDocument: document,
    locale,
    backend: "canvas",
    features: {},
    editor: {},
    ui: {}
  } as unknown as ClassicEditorRenderContext;
  const model: ClassicEditorShellModel = {
    context,
    locale,
    backend: "canvas",
    theme: defaultTheme,
    options: {
      menuBar: true,
      ribbon: true,
      toolbar: true,
      ribbonOverflow: "scroll",
      ruler: false,
      leftSidebar: false,
      rightSidebar: false,
      statusBar: true,
      activeRibbonTab: "home",
      commandBar: {}
    }
  };
  const app = createClassicEditorUiApp(
    ClassicEditorWorkspaceWidgets,
    { model },
    () => model.theme
  );
  app.mount(host);
  await nextTick();
  if (capturedController === undefined) {
    app.unmount();
    root.remove();
    throw new Error("Workspace Panel fixture did not connect its typed controller.");
  }
  return {
    root,
    controller: capturedController,
    panels: connectedPanels,
    destroy: () => destroyFixture(app, root)
  };
}

/**
 * Creates the renderless plugin widget that transports one typed panel descriptor.
 *
 * @param panel - Typed panel definition.
 * @param index - Registry order used only for stable widget identity.
 * @returns Existing workspace-widget contribution shape.
 */
function createWorkspaceWidgetContribution(
  panel: ClassicEditorWorkspacePanelContribution,
  index: number
): ClassicEditorWorkspaceWidgetContribution {
  return {
    id: `fixture.workspace.${index}.${panel.id}`,
    kind: "workspace-widget",
    mount: () => ({ element: null, destroy: () => undefined })
  };
}

/**
 * Releases Vue and removes the root exactly once.
 *
 * @param app - Mounted Vue application.
 * @param root - Fixture root.
 */
function destroyFixture(app: App<Element>, root: HTMLElement): void {
  app.unmount();
  root.remove();
}
