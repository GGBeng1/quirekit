<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  ref,
  toRef,
  watch
} from "vue";
import {
  formatDeduplicatedDocumentServiceFeedbackForClipboard,
  formatDocumentServiceFeedbackForClipboard,
  locateDocumentServiceFeedbackItem,
  useClassicEditorDocumentServiceFeedback,
  type ClassicEditorDiagnosticCopyMode,
  type ClassicEditorDiagnosticCopyResult
} from "../document-service-feedback";
import { useClassicEditorShellContributions } from "../composables/use/shell-contributions";
import type { ClassicEditorShellModel } from "../types";
import TaskFeedbackHost from "./task-feedback/task-feedback-host.vue";

/** Inputs required by the document-service feedback surface. */
interface ClassicEditorDocumentServiceFeedbackProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
  /** Product root that owns document-service lifecycle events. */
  readonly root: HTMLElement | undefined;
}

const props = defineProps<ClassicEditorDocumentServiceFeedbackProps>();
const model = toRef(props, "model");
const root = toRef(props, "root");
const { message } = useClassicEditorShellContributions(model);
const { dismiss, feedback, keepVisible } = useClassicEditorDocumentServiceFeedback(model, root);
const copyResult = ref<ClassicEditorDiagnosticCopyResult | null>(null);
let copyResultTimer: ReturnType<typeof setTimeout> | undefined;
const alertRole = computed(() => (
  feedback.value?.tone === "error" || feedback.value?.tone === "warning"
    ? "alert"
    : "status"
));
const liveMode = computed(() => (
  alertRole.value === "alert" ? "assertive" : "polite"
));
const detailsLabel = computed(() => message(
  feedback.value?.tone === "success" ? "documentOperationDetails" : "documentDiagnosticDetails"
));
const copyAllLabel = computed(() => resolveCopyButtonLabel(
  "all",
  message("documentDiagnosticCopyAll")
));
const copyDeduplicatedLabel = computed(() => resolveCopyButtonLabel(
  "deduplicated",
  message("documentDiagnosticCopyDeduplicated")
));

watch(feedback, () => resetCopyResult());
onBeforeUnmount(() => resetCopyResult());

/** @param event - Native details toggle; opening makes the report user-owned. */
function onDetailsToggle(event: Event): void {
  if ((event.target as HTMLDetailsElement).open) keepVisible();
}

/**
 * Copies either the complete report or its path-insensitive semantic groups.
 *
 * @param mode - Requested diagnostic copy mode.
 * @returns Promise settled after clipboard access and visible feedback complete.
 */
async function copyDiagnostics(mode: ClassicEditorDiagnosticCopyMode): Promise<void> {
  const current = feedback.value;
  const clipboard = root.value?.ownerDocument.defaultView?.navigator.clipboard;
  if (current === null || clipboard === undefined) {
    setCopyResult({ mode, status: "failed" });
    return;
  }
  const text = mode === "all"
    ? formatDocumentServiceFeedbackForClipboard(current)
    : formatDeduplicatedDocumentServiceFeedbackForClipboard(current);
  try {
    await clipboard.writeText(text);
    setCopyResult({ mode, status: "copied" });
  } catch {
    setCopyResult({ mode, status: "failed" });
  }
}

/**
 * Resolves idle, success, or failure copy for one button.
 *
 * @param mode - Copy mode represented by the button.
 * @param idleLabel - Localized label used before interaction.
 * @returns Localized button label for the current transient state.
 */
function resolveCopyButtonLabel(
  mode: ClassicEditorDiagnosticCopyMode,
  idleLabel: string
): string {
  if (copyResult.value?.mode !== mode) return idleLabel;
  return message(
    copyResult.value.status === "copied"
      ? "documentDiagnosticCopied"
      : "documentDiagnosticCopyFailed"
  );
}

/**
 * Stores one copy outcome and schedules its reset.
 *
 * @param result - Copy mode and clipboard outcome to expose.
 */
function setCopyResult(result: ClassicEditorDiagnosticCopyResult): void {
  resetCopyResult();
  copyResult.value = result;
  copyResultTimer = setTimeout(() => {
    copyResult.value = null;
    copyResultTimer = undefined;
  }, 2_000);
}

/** Clears transient copy feedback and its pending timer. */
function resetCopyResult(): void {
  if (copyResultTimer !== undefined) {
    clearTimeout(copyResultTimer);
    copyResultTimer = undefined;
  }
  copyResult.value = null;
}
</script>

<template>
  <aside
    v-if="feedback !== null"
    class="qk-classic-editor__document-service-feedback"
    :data-tone="feedback.tone"
    :role="alertRole"
    :aria-live="liveMode"
  >
    <span
      class="qk-classic-editor__document-service-feedback-mark"
      aria-hidden="true"
    />
    <div class="qk-classic-editor__document-service-feedback-content">
      <strong>{{ feedback.title }}</strong>
      <span
        v-if="feedback.summary !== undefined"
        class="qk-classic-editor__document-service-feedback-summary"
      >
        {{ feedback.summary }}
      </span>
      <details
        v-if="feedback.items.length > 0"
        class="qk-classic-editor__document-service-feedback-details"
        @toggle="onDetailsToggle"
      >
        <summary>{{ detailsLabel }}</summary>
        <div
          class="qk-classic-editor__document-service-feedback-copy-actions"
          role="group"
          :aria-label="message('documentDiagnosticCopyActions')"
          aria-live="polite"
          aria-atomic="true"
        >
          <button
            type="button"
            data-copy-mode="all"
            :data-state="copyResult?.mode === 'all' ? copyResult.status : 'idle'"
            @click="copyDiagnostics('all')"
          >
            {{ copyAllLabel }}
          </button>
          <button
            type="button"
            data-copy-mode="deduplicated"
            :data-state="copyResult?.mode === 'deduplicated' ? copyResult.status : 'idle'"
            @click="copyDiagnostics('deduplicated')"
          >
            {{ copyDeduplicatedLabel }}
          </button>
        </div>
        <ul>
          <li
            v-for="(item, index) in feedback.items"
            :key="`${item.code}:${item.path ?? ''}:${index}`"
          >
            <div>
              <code>{{ item.code }}</code>
              <span v-if="item.path !== undefined">{{ item.path }}</span>
              <button
                v-if="item.position !== undefined"
                type="button"
                data-action="locate"
                @click="locateDocumentServiceFeedbackItem(model.context?.editor, item.position)"
              >
                {{ message("documentDiagnosticLocate") }}
              </button>
            </div>
            <p>{{ item.message }}</p>
          </li>
        </ul>
      </details>
    </div>
    <button
      type="button"
      class="qk-classic-editor__document-service-feedback-close"
      :aria-label="message('close')"
      @click="dismiss"
    >
      <span aria-hidden="true" />
    </button>
  </aside>
  <TaskFeedbackHost :model="model" />
</template>
