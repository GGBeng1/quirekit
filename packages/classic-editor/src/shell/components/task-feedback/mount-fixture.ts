import { defaultTheme } from "@quirekit/ui";
import { createEditor, type QuireEditor } from "@quirekit/core";
import { nextTick, type App } from "vue";
import { ClassicEditorKit } from "../../../extensions";
import { createClassicEditor } from "../../../runtime";
import type {
  ClassicEditorInstance,
  ClassicEditorLocale,
  ClassicEditorRenderContext,
  ClassicEditorViewBackend
} from "../../../types";
import type { ClassicEditorShellModel } from "../../types";
import { createClassicEditorUiApp } from "../../vue-app";
import ClassicEditorDocumentServiceFeedback from "../classic-editor-document-service-feedback.vue";

/** Mounted real task-feedback leaf used by Vue interaction tests. */
export interface MountedTaskFeedbackFixture {
  /** Product runtime whose public task controller drives the surface. */
  readonly instance: ClassicEditorInstance;
  /** Root containing the mounted Vue feedback leaf. */
  readonly host: HTMLElement;
  /** Destroys the Vue app and runtime authorities. */
  readonly destroy: () => void;
}

/** Options for a bilingual, backend-independent task-feedback mount. */
export interface MountTaskFeedbackFixtureOptions {
  /** Product locale projected into task copy. */
  readonly locale?: ClassicEditorLocale | undefined;
  /** View backend fact used to prove the leaf has no renderer coupling. */
  readonly backend?: ClassicEditorViewBackend | undefined;
}

/**
 * Mounts the actual shell feedback leaf with complete runtime authorities.
 *
 * @param options - Locale and renderer facts for the fixture.
 * @returns Mounted task surface and deterministic cleanup.
 */
export async function mountTaskFeedbackFixture(
  options: MountTaskFeedbackFixtureOptions = {}
): Promise<MountedTaskFeedbackFixture> {
  const locale = options.locale ?? "zh-CN";
  const backend = options.backend ?? "canvas";
  const host = document.createElement("div");
  const root = document.createElement("section");
  root.className = "qk-classic-editor";
  root.append(host);
  document.body.append(root);
  const instance = createClassicEditor({ locale, view: { backend } });
  const editor = createEditor({ extensions: [ClassicEditorKit] });
  const model = createModel(instance, editor, root, locale, backend);
  const app = createClassicEditorUiApp(
    ClassicEditorDocumentServiceFeedback,
    { model, root },
    () => model.theme
  );
  app.mount(host);
  await nextTick();
  return {
    instance,
    host,
    destroy: () => destroyFixture(app, editor, instance, root)
  };
}

/**
 * Creates the full private shell model used by the mounted leaf.
 *
 * @param instance - Product runtime authority.
 * @param editor - Core editor authority.
 * @param root - Instance-local shell root.
 * @param locale - Product locale.
 * @param backend - Active renderer fact.
 * @returns Complete shell model.
 */
function createModel(
  instance: ClassicEditorInstance,
  editor: QuireEditor,
  root: HTMLElement,
  locale: ClassicEditorLocale,
  backend: ClassicEditorViewBackend
): ClassicEditorShellModel {
  const context: ClassicEditorRenderContext = {
    instance,
    editor,
    root,
    ownerDocument: document,
    features: instance.features,
    locale,
    backend,
    ui: instance.ui
  };
  return {
    context,
    locale,
    backend,
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
}

/**
 * Releases all mounted authorities exactly once.
 *
 * @param app - Vue root.
 * @param editor - Core editor.
 * @param instance - Product runtime.
 * @param root - Fixture DOM root.
 */
function destroyFixture(
  app: App<Element>,
  editor: QuireEditor,
  instance: ClassicEditorInstance,
  root: HTMLElement
): void {
  app.unmount();
  editor.destroy();
  instance.destroy();
  root.remove();
}
