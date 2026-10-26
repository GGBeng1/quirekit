<script setup lang="ts">
import { computed, ref } from "vue";
import { QuireSegmented } from "@quirekit/ui/vue";
import Timeline from "./timeline.vue";
import Versions from "./versions.vue";
import { versionLabels } from "./version-labels";
import type { MdActivityViewProps } from "./version-types";
const props = defineProps<MdActivityViewProps>();
const text = computed(() => versionLabels[props.timeline.locale]);
const tab = ref<string | null>("records");
const tabs = computed(() => [{ value: "records", label: text.value.records }, { value: "versions", label: text.value.versions }]);
</script>
<template>
  <div class="md-activity-view">
    <QuireSegmented v-if="props.versions" v-model="tab" :items="tabs" :label="text.view" size="sm" equal class="md-activity-view__tabs" />
    <Versions v-if="props.versions && tab === 'versions'" v-bind="props.versions" />
    <Timeline v-else v-bind="props.timeline" />
  </div>
</template>
<style scoped>
.md-activity-view { display: flex; flex-direction: column; min-width: 0; height: 100%; min-height: 0; }
.md-activity-view__tabs { flex: none; margin: var(--qk-space-surface) var(--qk-space-surface) 0; }
/* 面板高度固定，切换按钮留在顶部，记录与版本列表在下方各自滚动。 */
.md-activity-view > .md-activity, .md-activity-view > .md-versions { flex: 1; min-height: 0; align-content: start; overflow-y: auto; overscroll-behavior: contain; }
</style>
