import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { ClassicEditorRenderContext } from "../../../../types";
import type { ClassicEditorOverlayController } from "../../../overlays/registry";
import type { ClassicToolbarPopupEntry } from "./types";

/** @param path - Feature-local ancestry. @returns Collision-free key for one popup lifecycle. */
export function classicToolbarPopupKey(path: readonly string[]): string {
  return path.map(encodeURIComponent).join("/");
}

/** @param item - Individual public entry. @returns Whether Toolbar owns an actual floating surface. */
function ownsPopup(item: QuireKitToolbarEntry): boolean {
  return item.kind === "menu" || item.kind === "selector" || item.kind === "split"
    || (item.kind === "custom" && item.popup !== undefined && item.popup !== false)
    || (item.kind === "disclosure" && item.popup !== false && item.contentRenderer !== undefined);
}

/**
 * Finds actual popup entries without enrolling persistent panels or external dialogs.
 * @param items - Current feature controls.
 * @param parent - Original feature-local ancestry.
 * @returns Individual lifecycles retained independently of the toolbar renderer.
 */
export function collectClassicToolbarPopups(items: readonly QuireKitToolbarEntry[], parent: readonly string[] = []): readonly ClassicToolbarPopupEntry[] {
  return items.flatMap(item => {
    // Match ToolbarItems omission: a hidden ancestor removes every descendant surface.
    if (item.hidden) return [];
    const path = [...parent, item.value];
    return [
      ...(ownsPopup(item) ? [{ key: classicToolbarPopupKey(path), item, path }] : []),
      ...collectClassicToolbarPopups(item.children ?? [], path)
    ];
  });
}

/**
 * Publishes only coordinator-admitted visibility and shared trigger/content ownership.
 * @param items - Original feature controls and business state.
 * @param owners - Stable mounted owners indexed by feature-local path.
 * @param context - Current instance root and locale.
 * @param parent - Original feature-local ancestry.
 * @param portalTarget - Optional document-overlay host for anchored toolbars; Ribbon keeps its body portal.
 * @returns Public entries whose popup machine cannot bypass Classic admission.
 */
export function projectClassicToolbarPopupOwners(
  items: readonly QuireKitToolbarEntry[],
  owners: ReadonlyMap<string, ClassicEditorOverlayController>,
  context: ClassicEditorRenderContext,
  parent: readonly string[] = [],
  portalTarget?: HTMLElement
): readonly QuireKitToolbarEntry[] {
  return items.map(item => {
    const path = [...parent, item.value];
    const owner = owners.get(classicToolbarPopupKey(path));
    return {
      ...item,
      ...(ownsPopup(item) ? {
        expanded: owner?.isVisible() ?? false,
        attributes: { ...item.attributes, ...owner?.ownerAttributes },
        overlayProps: {
          portalTarget: portalTarget ?? context.root.ownerDocument.body,
          ...item.overlayProps,
          contentAttributes: { lang: context.locale, ...item.overlayProps?.contentAttributes, ...owner?.ownerAttributes }
        }
      } : {}),
      ...(item.children === undefined ? {} : { children: projectClassicToolbarPopupOwners(item.children, owners, context, path, portalTarget) })
    };
  });
}
