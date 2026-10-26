<script setup lang="ts">
import type { QuireKitToolbarEntry, QuireKitToolbarRow, QuireKitToolbarExecuteEvent, QuireKitToolbarOpenChangeEvent } from "../../../components/toolbar/types";
import type { QuireKitToolbarRendererScope, QuireKitToolbarRenderers } from "./types";
import ToolbarItems from "./items.vue";
import QuireToolbarGroup from "../toolbar-group.vue";
import { toolbarCollapseKey } from "../collapse/units";

defineProps<{
  /** Legacy single-row contributions. */
  items: readonly QuireKitToolbarEntry[] | undefined;
  /** Explicit rows; their groups inherit the existing root, never a nested Toolbar. */
  rows: readonly QuireKitToolbarRow[] | undefined;
  /** Opaque host state. */
  context?: unknown;
  /** Shared controls and popup renderers. */
  renderers: QuireKitToolbarRenderers;
  /** Wraps each top-level entry in a measurable unit for collapse layout. */
  units?: boolean;
}>();
defineSlots<{
  /** Custom control fallback shared by every row. */
  item?: (scope: QuireKitToolbarRendererScope) => unknown;
  /** Custom popup fallback shared by every row. */
  content?: (scope: QuireKitToolbarRendererScope) => unknown;
}>();
const emit = defineEmits<{
  /** One intent from the existing entry adapter. */
  execute: [event: QuireKitToolbarExecuteEvent];
  /** One popup transition from the existing entry adapter. */
  openChange: [event: QuireKitToolbarOpenChangeEvent];
}>();
</script>

<template>
  <!-- One keyed anatomy retains open/focused controls across overflow modes.
       Only collapse wrappers create boxes; other single-row modes flatten them. -->
  <template v-if="rows === undefined">
    <template v-for="item in (items ?? []).filter(entry => !entry.hidden)" :key="item.value">
      <QuireToolbarGroup v-if="item.kind === 'group'" :label="item.label">
        <div v-for="child in (item.children ?? []).filter(entry => !entry.hidden)" :key="child.value" :class="units ? 'qk-toolbar__unit' : undefined" :style="units ? undefined : { display: 'contents' }" :data-qk-toolbar-unit="units ? toolbarCollapseKey(item, child) : undefined">
          <ToolbarItems :items="[child]" :path="[item.value]" :disabled="!!item.disabled" :context="context" :renderers="renderers"
            @execute="emit('execute', $event)" @open-change="emit('openChange', $event)">
            <template v-if="$slots.item" #item="scope"><slot name="item" v-bind="scope" /></template>
            <template v-if="$slots.content" #content="scope"><slot name="content" v-bind="scope" /></template>
          </ToolbarItems>
        </div>
      </QuireToolbarGroup>
      <div v-else :class="units ? 'qk-toolbar__unit' : undefined" :style="units ? undefined : { display: 'contents' }" :data-qk-toolbar-unit="units ? item.value : undefined">
        <ToolbarItems :items="[item]" :context="context" :renderers="renderers"
          @execute="emit('execute', $event)" @open-change="emit('openChange', $event)">
          <template v-if="$slots.item" #item="scope"><slot name="item" v-bind="scope" /></template>
          <template v-if="$slots.content" #content="scope"><slot name="content" v-bind="scope" /></template>
        </ToolbarItems>
      </div>
    </template>
  </template>
  <template v-else v-for="row in rows" :key="row.value">
    <div v-if="!row.hidden && row.items.some(item => !item.hidden)" role="group" :aria-label="row.label" :data-qk-toolbar-row="row.value" class="qk-toolbar__row">
      <ToolbarItems :items="row.items" :path="[row.value]" :disabled="row.disabled ?? false" :context="context" :renderers="renderers"
        @execute="emit('execute', $event)" @open-change="emit('openChange', $event)">
        <template v-if="$slots.item" #item="scope"><slot name="item" v-bind="scope" /></template>
        <template v-if="$slots.content" #content="scope"><slot name="content" v-bind="scope" /></template>
      </ToolbarItems>
    </div>
  </template>
</template>
