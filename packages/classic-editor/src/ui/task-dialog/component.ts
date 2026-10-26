import type { DefineSetupFnComponent } from "vue";
import TaskDialog from "./task-dialog.vue";
import type { ClassicEditorTaskDialogProps } from "./types";

type ClassicEditorTaskDialogEmits = {
  "update:show": (show: boolean) => void;
  esc: () => void;
  submit: () => void;
};

/** Shared Classic task-dialog recipe with a stable public declaration. */
export const ClassicEditorTaskDialog = TaskDialog as unknown as
  DefineSetupFnComponent<
    ClassicEditorTaskDialogProps,
    ClassicEditorTaskDialogEmits
  >;
