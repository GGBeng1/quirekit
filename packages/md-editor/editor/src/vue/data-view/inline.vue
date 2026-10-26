<script setup lang="ts">
import { DataViewInline } from "@quirekit/data-view-editor/vue";
import type { MsfeDataViewSurface } from "@quirekit/msfe-data-view";
/** Source-controlled surface mounted by the existing Vue component host. */
interface Props {
  /** Current canonical source and conditional host actions. */ readonly view: MsfeDataViewSurface;
}
defineProps<Props>();
</script>
<template>
  <figure class="md-data-view" data-qk-data-view="inline" data-qk-not-prose aria-label="多维表格" tabindex="-1">
    <DataViewInline :value="view.dataView" :read-only="view.readOnly" :commit="view.commit" :undo="view.undo" :redo="view.redo" />
  </figure>
</template>
<style scoped>
.md-data-view { margin: 0; min-width: 0; max-width: 100%; outline: none; }
</style>
