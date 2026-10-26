import { computed, markRaw, ref } from "vue";
import { isUnderlineActive, isUnderlineStyle } from "@quirekit/extension-underline";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { ClassicEditorToolbarContribution, ClassicEditorToolbarContributionState } from "@classic/types";
import { textPanelMessage } from "../text-panel/copy";
import GalleryBody from "./toolbar-body.vue";

/**
 * Projects the existing underline command and shared style gallery into Toolbar.
 * @param state - Latest Classic selection, editability and locale projection.
 * @returns A split control without an additional always-mounted editor subscription.
 */
export function createClassicUnderlineToolbar(state: ClassicEditorToolbarContributionState): ClassicEditorToolbarContribution {
  const expanded = ref(false);
  return {
    context: state, renderers: { underline: markRaw(GalleryBody) },
    items: computed<readonly QuireKitToolbarEntry[]>(() => [{
      value: "underline", kind: "split", icon: "underline",
      label: textPanelMessage(state.context.locale, "underline"),
      disclosureLabel: state.context.locale === "zh-CN" ? "下划线样式" : "Underline styles",
      pressed: isUnderlineActive(state.context.editor.state.pm),
      disabled: !state.context.editor.isEditable, expanded: expanded.value,
      contentRenderer: "underline",
      overlayProps: { portalTarget: state.context.ownerDocument.body, contentAttributes: { lang: state.context.locale, class: "qk-classic-underline-popup" } }
    }]),
    /** @param event - Primary toggle or validated gallery activation. */
    execute(event) {
      const editor = state.context.editor;
      if (!editor.isEditable) return;
      if (event.source === "action") editor.commands.toggleUnderline();
      else if (isUnderlineStyle(event.payload)) {
        editor.commands.setUnderline({ underlineType: event.payload });
        expanded.value = false;
      }
    },
    /** @param event - Public Popover visibility and focus lifecycle. */
    openChange(event) { expanded.value = event.expanded; }
  };
}
