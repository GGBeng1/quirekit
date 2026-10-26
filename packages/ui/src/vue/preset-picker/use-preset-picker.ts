import type { QuireKitPresetGalleryItem } from "../../components/preset-gallery/types";
import type { QuireKitPresetPickerProps, QuireKitPresetSubmitRequest } from "../../components/preset-picker/types";
import { useSelectionTask } from "../shared/task/selection/use-picker";
import type { TaskSelectionRequest, TaskSelectionSurfaceProps } from "../shared/task/selection/types";
import type { PresetPickerEvents } from "./types";

/**
 * Projects one public preset into the shared array-based selection session.
 * @param props - Live single-value task inputs.
 * @param events - Public model and completion notifications.
 * @returns Shared picker surfaces, trigger, draft and request ownership.
 */
export function usePresetPicker(props: QuireKitPresetPickerProps, events: PresetPickerEvents) {
  const submissions = new WeakMap<TaskSelectionRequest, QuireKitPresetSubmitRequest>();
  /**
   * Preserves the same immutable single-value request through submit and notification.
   * @param request - Shared selection snapshot owned by the current task session.
   * @returns Corresponding single-value snapshot without exposing the array boundary.
   */
  function toPresetRequest(request: TaskSelectionRequest): QuireKitPresetSubmitRequest {
    let preset = submissions.get(request);
    if (!preset) {
      preset = Object.freeze({ sessionId: request.sessionId, requestId: request.requestId, signal: request.signal,
        value: request.value[0] ?? null, previousValue: request.previousValue[0] ?? null });
      submissions.set(request, preset);
    }
    return preset;
  }
  const projected: TaskSelectionSurfaceProps<QuireKitPresetGalleryItem> = {
    get title() { return props.title; },
    get items() { return props.items; },
    get modelValue() { return props.modelValue === undefined ? undefined : props.modelValue === null ? [] : [props.modelValue]; },
    get defaultValue() { return props.defaultValue == null ? [] : [props.defaultValue]; },
    selectionMode: "single",
    get commitMode() { return props.commitMode ?? "explicit"; },
    get presentation() { return props.presentation; },
    get open() { return props.open; },
    get defaultOpen() { return props.defaultOpen; },
    get disabled() { return props.disabled; },
    get finalFocusEl() { return props.finalFocusEl; },
    get onCloseRequest() { return props.onCloseRequest; },
    /** @param request - Shared proposal forwarded once to the optional public business callback. @returns Optional business completion. */
    submit(request) { return props.submit?.(toPresetRequest(request)); }
  };
  return useSelectionTask(projected, {
    ...events,
    updateValue: value => events.updateValue(value[0] ?? null),
    commit: request => events.commit(toPresetRequest(request)),
    error: details => events.error({ error: details.error, request: toPresetRequest(details.request) }),
    /** Preset tasks do not expose a query input. */
    updateQuery() {},
    /** Preset tasks do not initiate a search callback. */
    search() {}
  });
}
