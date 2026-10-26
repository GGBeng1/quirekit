import type {
  ClassicEditorActionContext,
  ClassicEditorActionDefinition,
  ClassicEditorActionRibbonControlContribution,
  ClassicEditorContribution,
  ClassicEditorInstance,
  ClassicEditorMountedRenderable,
  ClassicEditorRenderContext,
  ClassicEditorWorkspaceWidgetContribution
} from "../../../types";
import type { ClassicEditorInsertCatalogOptions } from "../../../types/insert";
import {
  mountClassicEditorInsertSurface,
  type ClassicEditorInsertSurfaceHandle
} from "../../components/insert";

/** Stable ids owned by the one shared Insert discovery surface. */
export const classicEditorInsertContributionIds = Object.freeze({
  action: "insert.open-catalog",
  ribbon: "ribbon.insert-catalog",
  workspace: "workspace.insert-catalog"
});

/**
 * Creates one typed trigger and one layout-neutral workspace surface.
 *
 * Feature owners supply canonical actions through `options.items`; this factory
 * only owns discovery, focus, capability presentation, and recent-success UI.
 *
 * @param options - Typed Insert item definitions and recent-use limit.
 * @returns Direct ribbon action plus its root-local workspace presenter.
 */
export function createClassicEditorInsertCatalogContributions(
  options: ClassicEditorInsertCatalogOptions
): readonly ClassicEditorContribution[] {
  const handles = new WeakMap<ClassicEditorInstance, ClassicEditorInsertSurfaceHandle>();
  const action = createOpenAction(handles);
  const ribbon: ClassicEditorActionRibbonControlContribution = Object.freeze({
    kind: "ribbon-action-control",
    id: classicEditorInsertContributionIds.ribbon,
    groupId: "insert-content",
    label: action.label,
    title: {
      "zh-CN": "打开可搜索的插入内容目录",
      en: "Open the searchable Insert catalog"
    },
    icon: "plus",
    presentation: "icon-label",
    order: 190,
    action
  });
  const workspace: ClassicEditorWorkspaceWidgetContribution = Object.freeze({
    kind: "workspace-widget",
    id: classicEditorInsertContributionIds.workspace,
    order: 190,
    mount(context: ClassicEditorRenderContext): ClassicEditorMountedRenderable {
      const mounted = mountClassicEditorInsertSurface(context, options);
      handles.set(context.instance, mounted.handle);
      return {
        element: mounted.element,
        /** @param nextContext - Latest mounted context retaining the same product instance. */
        update(nextContext: ClassicEditorRenderContext): void {
          mounted.update?.(nextContext);
        },
        /** Releases only this instance's registered trigger port. */
        destroy(): void {
          handles.delete(context.instance);
          mounted.destroy();
        }
      };
    }
  });
  return Object.freeze([ribbon, workspace]);
}

/**
 * Creates the UI-only typed action that opens a mounted Insert surface.
 *
 * @param handles - Per-editor surface ports owned by workspace widget lifecycles.
 * @returns Canonical action definition retaining the exact instance port.
 */
function createOpenAction(
  handles: WeakMap<ClassicEditorInstance, ClassicEditorInsertSurfaceHandle>
): ClassicEditorActionDefinition {
  return Object.freeze({
    id: classicEditorInsertContributionIds.action,
    label: { "zh-CN": "插入内容", en: "Insert content" },
    icon: "plus",
    group: "insert",
    order: 190,
    canExecute: (context: ClassicEditorActionContext) => handles.has(context.instance),
    disabledReason: () => ({
      code: "insert-surface-unmounted",
      message: {
        "zh-CN": "插入面板尚未准备好",
        en: "The Insert surface is not ready"
      }
    }),
    run(context: ClassicEditorActionContext): boolean {
      const handle = handles.get(context.instance);
      if (handle === undefined) return false;
      const activeElement = context.ownerDocument.activeElement;
      const HTMLElementConstructor = context.ownerDocument.defaultView?.HTMLElement;
      handle.open(
        HTMLElementConstructor !== undefined
          && activeElement instanceof HTMLElementConstructor
          && context.root.contains(activeElement)
          ? activeElement
          : null
      );
      return true;
    }
  });
}
