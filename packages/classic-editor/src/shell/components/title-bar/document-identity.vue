<script setup lang="ts">
import { QuireEditable } from "@quirekit/ui/vue";
import { computed, ref, toRef, watch } from "vue";
import type { QuireKitEditableValueDetails } from "@quirekit/ui";
import { useClassicEditorShellContributions } from "../../composables/use/shell-contributions";
import type { ClassicEditorShellModel } from "../../types";
import ClassicEditorBrandMark from "../classic-editor-brand-mark.vue";

/** Reactive inputs rendered by the product and document identity. */
interface ClassicEditorDocumentIdentityProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
}

const props = defineProps<ClassicEditorDocumentIdentityProps>();
const { message } = useClassicEditorShellContributions(toRef(props, "model"));
const documentName = computed(() => (
  props.model.context?.instance.documentName ?? message("untitledDocument")
));
const draftName = ref(documentName.value);

watch(documentName, name => { draftName.value = name; });

/**
 * Commits one normalized product-level document name.
 *
 * @param details - Editable value committed by Enter or blur.
 */
function commitDocumentName(details: QuireKitEditableValueDetails): void {
  props.model.context?.instance.setDocumentName(details.value);
}
</script>

<template>
  <div class="qk-classic-editor__document-identity">
    <ClassicEditorBrandMark />
    <span class="qk-classic-editor__product-name">QuireKit</span>
    <span class="qk-classic-editor__identity-separator" aria-hidden="true" />
    <div class="qk-classic-editor__document-title">
      <QuireEditable
        v-model="draftName"
        :label="message('documentName')"
        hide-label
        :placeholder="message('untitledDocument')"
        :read-only="model.context === undefined"
        :controls="false"
        activation-mode="click"
        submit-mode="both"
        auto-resize
        :max-length="120"
        @value-commit="commitDocumentName"
      />
    </div>
  </div>
</template>
