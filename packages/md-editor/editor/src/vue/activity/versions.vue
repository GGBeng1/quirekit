<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import { QuireButton, QuireInput } from "@quirekit/ui/vue";
import type { VersionRecord } from "@quirekit/edit-history";
import Preview from "./preview.vue";
import { versionLabels } from "./version-labels";
import type { MdVersionListProps } from "./version-types";
const props = defineProps<MdVersionListProps>();
const text = computed(() => versionLabels[props.locale]);
const items = shallowRef<readonly VersionRecord[]>([]), cursor = ref<string>();
const loading = ref(false), failed = ref(false), saving = ref(false), saveFailed = ref(false), name = ref("");
const selected = shallowRef<VersionRecord>(), root = ref<HTMLElement>();
const timeFormat = computed(() => new Intl.DateTimeFormat(props.locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }));
let generation = 0;

/** @param reset - Start from the newest version instead of continuing. */
async function load(reset: boolean): Promise<void> {
  const token = reset ? ++generation : generation;
  loading.value = true; failed.value = false;
  try {
    const page = await props.versions.list({ documentId: props.documentId, limit: 30, ...(reset || !cursor.value ? {} : { cursor: cursor.value }) });
    if (token !== generation) return;
    items.value = reset ? page.items : [...items.value, ...page.items]; cursor.value = page.cursor;
  } catch { if (token === generation) failed.value = true; }
  finally { if (token === generation) loading.value = false; }
}
/** Saves the current source, named when a name was typed. */
async function save(): Promise<void> {
  const controller = props.controller();
  if (!controller || saving.value) return;
  saving.value = true; saveFailed.value = false;
  try { await controller.save(name.value); name.value = ""; await load(true); }
  catch { saveFailed.value = true; }
  finally { saving.value = false; }
}
/** @param record - Listed version. @returns Its name, or a label for how it came to exist. */
const title = (record: VersionRecord): string => record.name ?? text.value.trigger[record.trigger];
void load(true);
</script>
<template>
  <div ref="root" class="md-versions" data-md-versions>
    <form v-if="props.controller()" class="md-versions__save" @submit.prevent="save">
      <QuireInput v-model="name" :placeholder="text.name" :aria-label="text.name" size="sm" width="100%" />
      <QuireButton type="submit" size="sm" :loading="saving">{{ text.save }}</QuireButton>
    </form>
    <p v-if="saveFailed" class="md-versions__note" role="alert">{{ text.saveFailed }}</p>
    <p v-if="failed" class="md-versions__note" role="alert">{{ text.failed }} <QuireButton size="xs" variant="ghost" @click="load(true)">{{ text.retry }}</QuireButton></p>
    <p v-else-if="!loading && !items.length" class="md-versions__note">{{ text.empty }}</p>
    <ol class="md-versions__list">
      <li v-for="record in items" :key="record.id">
        <button type="button" class="md-versions__item" :data-trigger="record.trigger" @click="selected = record">
          <span class="md-versions__title">{{ title(record) }}</span>
          <span class="md-versions__meta"><time :datetime="record.createdAt">{{ timeFormat.format(new Date(record.createdAt)) }}</time><template v-if="record.actor"> · {{ record.actor.name ?? record.actor.id }}</template></span>
        </button>
      </li>
    </ol>
    <QuireButton v-if="cursor" size="sm" variant="ghost" :loading="loading" @click="load(false)">{{ text.more }}</QuireButton>
    <Preview v-if="selected && root" v-bind="props" :record="selected" :owner="root" @close="selected = undefined" @restored="selected = undefined; load(true)" />
  </div>
</template>
<style scoped>
.md-versions { display: grid; gap: var(--qk-space-group); padding: var(--qk-space-surface); min-width: 0;
  font-size: var(--qk-type-body-font-size); line-height: var(--qk-type-body-line-height); }
.md-versions__save { display: flex; gap: var(--qk-space-inline); align-items: center; }
.md-versions__note { margin: 0; font-size: var(--qk-type-helper-font-size); color: var(--qk-color-text-secondary); }
.md-versions__list { display: grid; gap: var(--qk-space-inline-tight); margin: 0; padding: 0; list-style: none; }
.md-versions__item { display: grid; gap: 2px; width: 100%; padding: var(--qk-space-inline); border: 0; border-radius: var(--qk-radius-control);
  background: none; font: inherit; text-align: start; color: var(--qk-color-text-primary); cursor: pointer; }
.md-versions__item:hover { background: var(--qk-color-surface-subtle); }
.md-versions__item:focus-visible { outline: var(--qk-border-width-focus) solid var(--qk-color-border-focus); outline-offset: calc(-1 * var(--qk-border-width-focus)); }
.md-versions__item[data-trigger="named"] .md-versions__title { font-weight: var(--qk-type-heading-font-weight); }
.md-versions__meta { font-size: var(--qk-type-helper-font-size); color: var(--qk-color-text-secondary); font-variant-numeric: tabular-nums; }
</style>
