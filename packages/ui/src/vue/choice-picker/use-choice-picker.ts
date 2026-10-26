import { useSelectionTask } from "../shared/task/selection/use-picker";
import type { ChoicePickerEvents, ChoicePickerRuntimeProps } from "./types";

/**
 * Projects public choice inputs onto the shared adaptive selection task.
 * @param props - Reactive public choice contract materialized by Vue.
 * @param events - Sole public notification owner.
 * @returns Shared selection and presentation bindings.
 */
export function useChoicePicker(props: ChoicePickerRuntimeProps, events: ChoicePickerEvents) {
  return useSelectionTask(props, events);
}
