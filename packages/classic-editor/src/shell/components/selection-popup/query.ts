import { posToDOMRect } from "@quirekit/core";
import type {
  ClassicEditorRenderContext,
  ClassicEditorSelectionPopupTrigger
} from "@classic/types";
import {
  resolveClassicEditorContributionBehavior
} from "../../contribution/utils";
import { isClassicEditorPresentationActionAvailable } from "../../../runtime/ui/presentation/actions";

import type { ClassicEditorAnySelectionPopupItemContribution } from "@classic/types";
export type { ClassicEditorAnySelectionPopupItemContribution } from "@classic/types";

/**
 * Resolves one current non-empty text selection and its viewport geometry.
 *
 * @param context - Current mounted editor context.
 * @returns Normalized selection trigger or null outside a text selection.
 */
export function resolveClassicEditorSelectionPopupTrigger(
  context: ClassicEditorRenderContext | undefined
): ClassicEditorSelectionPopupTrigger | null {
  if (context === undefined) return null;
  const selection = context.editor.state.pm.selection;
  if (selection.empty || selection.toJSON().type !== "text") return null;
  const rect = posToDOMRect(context.editor.view, selection.from, selection.to);
  return {
    kind: "selection-popup",
    from: selection.from,
    to: selection.to,
    rect: copyRect(rect)
  };
}

/**
 * Resolves applicable and installed items for the current selection.
 *
 * @param context - Current mounted editor context.
 * @param trigger - Current normalized selection trigger.
 * @param contributions - Registered selection Popup Menu items.
 * @returns Applicable selection actions in registry order.
 */
export function resolveClassicEditorSelectionPopupItems(
  context: ClassicEditorRenderContext | undefined,
  trigger: ClassicEditorSelectionPopupTrigger | null,
  contributions: readonly ClassicEditorAnySelectionPopupItemContribution[]
): readonly ClassicEditorAnySelectionPopupItemContribution[] {
  if (context === undefined || trigger === null) return [];
  return contributions.filter((item) => (
    ("toolbar" in item || item.whenTrigger?.(trigger, context) !== false)
    && (() => {
      if ("toolbar" in item) return true;
      const payload = item.payload?.(trigger, context);
      if ("action" in item) {
        return isClassicEditorPresentationActionAvailable(
          item.action, context, payload, "selection-popup", trigger
        );
      }
      const behavior = resolveClassicEditorContributionBehavior(item);
      return behavior !== undefined && context.instance.isContributionAvailable(behavior, payload);
    })()
  ));
}

/**
 * Copies mutable DOM geometry into the immutable contribution trigger.
 *
 * @param rect - View-derived selection rectangle.
 * @returns Frozen viewport rectangle.
 */
function copyRect(
  rect: DOMRect
): ClassicEditorSelectionPopupTrigger["rect"] {
  return Object.freeze({
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height
  });
}
