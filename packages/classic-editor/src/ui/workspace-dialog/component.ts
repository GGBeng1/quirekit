import type { DefineSetupFnComponent } from "vue";
import WorkspaceDialog from "./workspace-dialog.vue";
import type { ClassicEditorWorkspaceDialogProps } from "./types";

type ClassicEditorWorkspaceDialogEmits = {
  "update:show": (show: boolean) => void;
  esc: () => void;
};

/** Shared Classic workspace-dialog recipe with a stable public declaration. */
export const ClassicEditorWorkspaceDialog = WorkspaceDialog as unknown as
  DefineSetupFnComponent<
    ClassicEditorWorkspaceDialogProps,
    ClassicEditorWorkspaceDialogEmits
  >;
