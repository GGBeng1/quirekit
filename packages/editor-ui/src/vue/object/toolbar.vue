<script setup lang="ts">
import { QuireToolbar } from "@quirekit/ui/vue";
import type { QuireKitToolbarEntry, QuireKitToolbarRow, QuireKitToolbarExecuteEvent, QuireKitToolbarOpenChangeEvent } from "@quirekit/ui";
import type { Component } from "vue";
defineProps<{
 /** Feature-owned accessible name. */ label: string;
 /** One-row feature controls. */ items?: readonly QuireKitToolbarEntry[];
 /** Multi-row feature controls. */ rows?: readonly QuireKitToolbarRow[];
 /** Feature-owned renderers using public Toolbar scopes. */ renderers?: Readonly<Record<string, Component>>;
 /** Exact-target command context. */ context?: unknown;
 /** Floating or embedded presentation. */ variant?: "plain" | "elevated";
}>();
const emit = defineEmits<{ execute: [event: QuireKitToolbarExecuteEvent]; openChange: [event: QuireKitToolbarOpenChangeEvent] }>();
</script>
<template>
 <QuireToolbar class="qk-object-action-bar" :label="label" v-bind="rows?.length ? { rows } : { items: items ?? [] }" :renderers="renderers ?? {}" :context="context"
  :variant="variant ?? 'elevated'" align="start" sizing="units" preserve-focus scrollbar="hidden" @execute="emit('execute', $event)" @open-change="emit('openChange', $event)">
  <template #content="scope"><slot name="content" v-bind="scope" /></template>
 </QuireToolbar>
</template>
