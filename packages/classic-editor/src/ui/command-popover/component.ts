import type { DefineSetupFnComponent, SlotsType } from "vue";
import CommandPopover from "./command-popover.vue";
import type {
  ClassicEditorCommandPopoverProps,
  ClassicEditorCommandPopoverSlots
} from "./types";

type ClassicEditorCommandPopoverEmits = {
  "update:show": (show: boolean) => void;
  clickoutside: () => void;
};

/** Shared Classic command-popover recipe with a stable public declaration. */
export const ClassicEditorCommandPopover = CommandPopover as unknown as
  DefineSetupFnComponent<
    ClassicEditorCommandPopoverProps,
    ClassicEditorCommandPopoverEmits,
    SlotsType<ClassicEditorCommandPopoverSlots>
  >;
