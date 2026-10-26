import type { DefineSetupFnComponent } from "vue";
import ConfirmDialog from "./confirm-dialog.vue";
import type { ClassicEditorConfirmDialogProps } from "./types";

type ClassicEditorConfirmDialogEmits = {
  "update:show": (show: boolean) => void;
  cancel: () => void;
  confirm: () => void;
};

/** Shared product confirmation dialog with a stable public declaration. */
export const ClassicEditorConfirmDialog = ConfirmDialog as unknown as
  DefineSetupFnComponent<
    ClassicEditorConfirmDialogProps,
    ClassicEditorConfirmDialogEmits
  >;
