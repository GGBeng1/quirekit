<script setup lang="ts">
import type { QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import { EditorUIFontField } from "@quirekit/editor-ui/vue";
import { computed } from "vue";
import type { ClassicFontLibraryToolbarController } from "./types";
const props = defineProps<{ /** Shared toolbar control contract. */ scope: QuireKitToolbarRendererScope }>();
const { busyFamily, context, currentFamilyOptionKey, currentFamilyLabel, fontPickerOptions,
  effectiveFamily, targetLabel, message, selectFontOption, documentStatus, currentLoaderStatus } = props.scope.context as ClassicFontLibraryToolbarController;
const locale = computed(() => context.value.locale);
const contentProps = computed(() => ({ class: "qk-classic-editor__font-picker-menu", lang: locale.value, ...props.scope.item.overlayProps?.contentAttributes }));
</script>
<template>
 <EditorUIFontField :scope="scope" kind="family" class="qk-classic-editor__font-family-control" control-class="qk-classic-editor__font-family-select" :empty-label="message('noImportedFonts')" :label="`${targetLabel}：${message('fontFamily')}`" :value="currentFamilyOptionKey"
  :placeholder="currentFamilyLabel" :options="fontPickerOptions" :format-state="effectiveFamily.kind" :busy="busyFamily !== ''" :content-props="contentProps"
  :data-font-status="documentStatus?.status" :data-requested-family="documentStatus?.requestedFamily ?? undefined" :data-rendered-family="documentStatus?.renderedFamily ?? undefined" :data-web-font-phase="currentLoaderStatus?.phase"
  @select="selectFontOption" />
</template>
