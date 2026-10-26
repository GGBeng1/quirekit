import { shallowReactive } from "vue";
import { ClassicEditorInsertCatalog } from "../../../runtime/insert";
import { readClassicEditorAppearance } from "../../appearance";
import { createClassicEditorUiApp } from "../../vue-app";
import type {
  ClassicEditorMountedRenderable,
  ClassicEditorRenderContext
} from "../../../types";
import type { ClassicEditorInsertCatalogOptions } from "../../../types/insert";
import ClassicEditorInsertSurface from "./insert-surface.vue";
import type {
  ClassicEditorInsertSurfaceHandle,
  ClassicEditorInsertSurfaceState
} from "./types";

/** Mounted Insert surface plus its typed imperative trigger port. */
export interface MountedClassicEditorInsertSurface extends ClassicEditorMountedRenderable {
  /** Root-local host node appended by the workspace contribution. */
  readonly element: HTMLElement;
  /** Returns the surface port after the Vue root has mounted. */
  readonly handle: ClassicEditorInsertSurfaceHandle;
}

/**
 * Mounts one root-local Insert surface with instance-scoped recent-success state.
 *
 * @param context - Initial mounted product context.
 * @param options - Feature-owned typed Insert catalog options.
 * @returns Workspace renderable and exact trigger handle.
 */
export function mountClassicEditorInsertSurface(
  context: ClassicEditorRenderContext,
  options: ClassicEditorInsertCatalogOptions
): MountedClassicEditorInsertSurface {
  const element = context.ownerDocument.createElement("div");
  const state = shallowReactive<ClassicEditorInsertSurfaceState>({ context });
  const catalog = new ClassicEditorInsertCatalog(options);
  let surfaceHandle: ClassicEditorInsertSurfaceHandle | null = null;
  let pendingOpen = false;
  let pendingTrigger: HTMLElement | null = null;
  let destroyed = false;
  const handle: ClassicEditorInsertSurfaceHandle = Object.freeze({
    /** @param trigger - Exact focus-return control, queued until Vue registers. */
    open(trigger: HTMLElement | null): void {
      if (destroyed) return;
      if (surfaceHandle !== null) {
        surfaceHandle.open(trigger);
        return;
      }
      pendingOpen = true;
      pendingTrigger = trigger;
    },
    /** Cancels a queued open or closes the registered surface. */
    close(): void {
      pendingOpen = false;
      pendingTrigger = null;
      surfaceHandle?.close();
    }
  });
  const app = createClassicEditorUiApp(
    ClassicEditorInsertSurface,
    {
      state,
      catalog,
      registerHandle(nextHandle: ClassicEditorInsertSurfaceHandle | null): void {
        surfaceHandle = nextHandle;
        if (nextHandle === null || !pendingOpen) return;
        const trigger = pendingTrigger;
        pendingOpen = false;
        pendingTrigger = null;
        nextHandle.open(trigger);
      }
    },
    readClassicEditorAppearance(state.context.root)
  );
  element.className = "qk-classic-insert-host";
  app.mount(element);
  return {
    element,
    handle,
    /** @param nextContext - Latest mounted product render context. */
    update(nextContext: ClassicEditorRenderContext): void {
      state.context = nextContext;
    },
    /** Releases the Vue root, overlay registration, and recent-use state. */
    destroy(): void {
      destroyed = true;
      pendingOpen = false;
      pendingTrigger = null;
      app.unmount();
      surfaceHandle = null;
    }
  };
}
