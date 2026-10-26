import { computed, toValue } from "vue";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import { readEffectiveDirectEmphasisState } from "@quirekit/extension-text-style";
import type { ClassicEditorToolbarContribution, ClassicEditorToolbarContributionState } from "@classic/types";
import { executeClassicEditorAction, resolveClassicEditorActionState } from "@classic/runtime/ui";
import { resolveClassicEditorText } from "@classic/localization";
import { boldAction } from "../formatting/bold";
import { italicAction } from "../formatting/italic";
import { underlineAction } from "../formatting/underline";
import { createClassicFontFamilyToolbar } from "../typography/toolbar/font-family/factory";
import { createClassicFontSizeToolbar } from "../typography/toolbar/font-size/factory";
import { createClassicColorToolbar } from "../typography/toolbar/color/factory";
import { composeClassicEditorToolbar } from "./composition";

/**
 * Sizes a custom icon color picker like an icon disclosure.
 *
 * @param contribution - Color toolbar contribution.
 * @returns Same contribution with 1.5-unit custom controls.
 */
function withIconPickerSpan(contribution: ClassicEditorToolbarContribution): ClassicEditorToolbarContribution {
  return {
    ...contribution,
    items: computed(() => toValue(contribution.items).map(item => item.kind === "custom" ? { ...item, span: 1.5 } : item))
  };
}

/**
 * Reuses canonical text controls in an object/selection Toolbar row.
 * @param state - Live context plus the exact object target guard.
 * @returns Compact formatting controls; no new formatting commands or surface.
 */
export function createClassicEditorTextFormattingToolbar(state: ClassicEditorToolbarContributionState): ClassicEditorToolbarContribution {
  const font = createClassicFontFamilyToolbar(state);
  const size = createClassicFontSizeToolbar(state);
  const actions = [boldAction, italicAction, underlineAction];
  const emphasis: ClassicEditorToolbarContribution = {
    items: computed<readonly QuireKitToolbarEntry[]>(() => actions.map(action => {
      const current = resolveClassicEditorActionState(action, state.context, undefined, "contextual-popup");
      const mixed = action === underlineAction ? false : readEffectiveDirectEmphasisState(state.context.editor.state, action === boldAction ? "bold" : "italic") === null;
      return { value: action.id, label: resolveClassicEditorText(action.label, state.context.locale), icon: action.icon!, kind: "toggle",
        pressed: mixed ? "mixed" : current.active, disabled: !state.context.editor.isEditable || !current.canExecute };
    })),
    /** @param event - Accepted format intent. @returns Canonical command completion. */
    async execute(event) {
      const action = actions.find(candidate => candidate.id === event.value);
      if (!action || !state.context.editor.isEditable || state.isTargetCurrent?.() === false) return false;
      return executeClassicEditorAction(action, state.context, undefined, "contextual-popup");
    }
  };
  return composeClassicEditorToolbar(state, {
    font: { ...font, items: computed(() => toValue(font.items).filter(item => item.value === "family").map(item => ({ ...item, span: 5 }))) },
    size: { ...size, items: computed(() => toValue(size.items).filter(item => item.value === "size").map(item => ({ ...item, span: 2.5 }))) },
    emphasis,
    color: withIconPickerSpan(createClassicColorToolbar(state, "color")),
    highlight: withIconPickerSpan(createClassicColorToolbar(state, "backgroundColor"))
  });
}
