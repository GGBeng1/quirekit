<script setup lang="ts">
import { useMindEditorMessages } from "../messages";
import { createQuireKitToaster, QuireToaster } from "@quirekit/ui/vue";
import { onBeforeUnmount, watch, type PropType } from "vue";
import type { MindEditorImportReport } from "../../ui/files/types";
import FeedbackDialog from "../feedback/dialog.vue";
const { t } = useMindEditorMessages();
const props = defineProps({
  /** Lightweight feedback for the last completed import. */
  report: { type: Object as PropType<MindEditorImportReport | null>, default: null },
  /** Returns keyboard ownership to the imported canvas after closing a warning. */
  finalFocusEl: { type: Function as PropType<() => HTMLElement | null>, required: true },
});
const emit = defineEmits<{ /** Dismisses feedback and restores canvas focus. */ close: [] }>();
const toaster = createQuireKitToaster({ placement: "bottom-end", duration: 3000, max: 1 });
watch(() => props.report, report => {
  toaster.remove();
  if (report && report.operation !== "export" && !report.diagnostics.length) toaster.success({ title: t("imported", { title: report.title }), description: t("importUndo"), closable: true });
});
onBeforeUnmount(() => toaster.remove());
</script>

<template>
  <QuireToaster :toaster="toaster" />
  <FeedbackDialog :message="report?.diagnostics.length ? t(report.operation === 'export' ? 'exportDifferences' : 'importDifferences', { title: report.title, count: report.diagnostics.length }) : ''"
    :title="t(report?.operation === 'export' ? 'exportPartial' : 'importPartial')" detailed :dismiss-label="t('backEditor')" :final-focus-el="finalFocusEl" @close="emit('close')">
    <template v-if="report?.diagnostics.length">
      <p>{{ report.name }}</p>
      <details class="qk-mind-editor__file-differences">
        <summary>{{ t('conversionDetails') }}</summary>
        <p>{{ t(report.operation === 'export' ? 'exportConversionHelp' : 'conversionHelp') }}</p>
        <ul><li v-for="(item, index) in report.diagnostics.slice(0, 20)" :key="index"><code>{{ item.path }}</code><br />{{ t(item.code === 'unsupported-field' ? 'unsupportedField' : item.code === 'fallback' ? 'fallback' : 'diagnosticsTruncated') }}<br /><small>{{ item.message }}</small></li></ul>
        <p v-if="report.diagnostics.length > 20">{{ t('firstDifferences') }}</p>
      </details>
    </template>
  </FeedbackDialog>
</template>
