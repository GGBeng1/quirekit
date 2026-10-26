<script setup lang="ts">
import type { QuireKitToastStatus } from "@quirekit/ui";
import {
  createQuireKitToaster,
  QuireToaster
} from "@quirekit/ui/vue";
import {
  computed,
  onBeforeUnmount,
  toRef,
  watch
} from "vue";
import type { ClassicEditorTaskRecord } from "../../../types";
import type { ClassicEditorShellModel } from "../../types";
import { taskMessage } from "./localization";
import {
  resolveTaskLabel,
  resolveTaskStatus
} from "./presenter";
import { useClassicEditorTaskFeedback } from "./use/task-feedback";

/** Root-local task error feedback inputs. */
interface ClassicEditorTaskFeedbackHostProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
}

const props = defineProps<ClassicEditorTaskFeedbackHostProps>();
const model = toRef(props, "model");
const { controller, snapshot } = useClassicEditorTaskFeedback(model);
const locale = computed(() => props.model.context?.locale ?? props.model.locale);
const toaster = createQuireKitToaster({
  placement: "bottom-end",
  duration: 6_000,
  max: 3
});
const toastIds = new Map<string, string>();

watch([snapshot, locale], ([current, currentLocale]) => {
  const errors = current.tasks.filter((task) => (
    task.phase === "error" && !task.toastDismissed
  ));
  const liveKeys = new Set(errors.map(taskKey));

  for (const [key, toastId] of toastIds) {
    if (liveKeys.has(key)) continue;
    toastIds.delete(key);
    toaster.dismiss(toastId);
  }

  for (const task of errors) {
    const key = taskKey(task);
    const toastId = toastIds.get(key);
    const options = {
      type: "error" as const,
      title: resolveTaskLabel(task, currentLocale),
      description: resolveDiagnostic(task) ?? resolveTaskStatus(task, currentLocale),
      duration: task.canRetry ? Infinity : 6_000,
      closable: true,
      action: task.canRetry
        ? {
            label: taskMessage(currentLocale, "retry"),
            onClick: () => controller.value?.requestRetry(task.taskId)
          }
        : undefined
    };
    if (toastId !== undefined) {
      toaster.update(toastId, options);
      continue;
    }
    const createdId = toaster.create({
      ...options,
      onStatusChange: (details: { readonly status: QuireKitToastStatus }) => {
        if (details.status !== "unmounted") return;
        toastIds.delete(key);
        releaseMatchingError(task);
      }
    });
    toastIds.set(key, createdId);
  }

  for (const task of current.tasks) {
    if (task.phase === "inserted" || task.phase === "completed" || task.phase === "cancelled") {
      controller.value?.dismissToast(task.taskId);
    }
  }
}, { immediate: true });

onBeforeUnmount(() => {
  toastIds.clear();
  toaster.remove();
});

/** @param task - Task whose notification identity is needed. @returns Attempt-local key. */
function taskKey(task: ClassicEditorTaskRecord): string {
  return `${task.taskId}:${task.generation}`;
}

/** @param task - Failed task. @returns First safe diagnostic message or code. */
function resolveDiagnostic(task: ClassicEditorTaskRecord): string | undefined {
  return task.diagnostics.find((item) => item.message !== undefined)?.message
    ?? task.diagnostics[0]?.code;
}

/** Releases a failed record only if the dismissed notification still owns its generation. */
function releaseMatchingError(task: ClassicEditorTaskRecord): void {
  const current = controller.value?.snapshot.tasks.find((item) => item.taskId === task.taskId);
  if (current?.generation !== task.generation || current.phase !== "error") return;
  controller.value?.dismissToast(task.taskId);
}
</script>

<template>
  <QuireToaster
    :toaster="toaster"
  />
</template>
