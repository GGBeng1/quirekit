<script setup lang="ts">
import { computed, defineAsyncComponent, ref, shallowRef } from "vue";
import { QuireButton, QuireDiffViewer, QuireSegmented } from "@quirekit/ui/vue";
import type { VersionContent } from "@quirekit/edit-history";
import DialogSurface from "../dialogs/surface.vue";
import { unifiedPatch } from "./patch";
import { versionLabels } from "./version-labels";
import type { MdVersionPreviewProps } from "./version-types";
// The panel lives inside the editor, so the read-only preview editor loads lazily to keep module order acyclic.
const MdEditor = defineAsyncComponent(() => import("../editor.vue"));
const props = defineProps<MdVersionPreviewProps>();
const emit = defineEmits<{ /** Dialog dismissed. */ close: []; /** Document now matches the version. */ restored: [] }>();
const text = computed(() => versionLabels[props.locale]);
const content = shallowRef<VersionContent | null>(), error = ref<string>(), busy = ref(false), copied = ref(false);
const tab = ref<string | null>("preview");
const tabs = computed(() => [{ value: "preview", label: text.value.preview }, { value: "compare", label: text.value.compare }]);
// The comparison reads the editor source once per opening; the dialog is modal, so the source cannot change meanwhile.
const current = props.source();
const patch = computed(() => content.value ? unifiedPatch(current, content.value.value.replace(/^﻿/, "").replace(/\r\n?/g, "\n")) : "");
const title = computed(() => props.record.name ?? text.value.trigger[props.record.trigger]);

props.versions.read(props.record.id).then(found => {
  if (found?.content.format === "markdown") content.value = found.content; else error.value = found ? text.value.refused.format : text.value.missing;
}, () => { error.value = text.value.missing; });

/** Copies the version source so parts of it can be pasted back by hand. */
async function copy(): Promise<void> {
  if (!content.value) return;
  await props.owner.ownerDocument.defaultView?.navigator.clipboard.writeText(content.value.value);
  copied.value = true;
}
/** Restores the version through the editor and closes on success. */
async function restore(): Promise<void> {
  const controller = props.controller();
  if (!controller || busy.value) return;
  busy.value = true; error.value = undefined;
  try {
    const result = await controller.restore(props.record.id);
    if (result.ok) emit("restored"); else error.value = text.value.refused[result.reason];
  } catch { error.value = text.value.refused.rejected; }
  finally { busy.value = false; }
}
</script>
<template>
  <DialogSurface :owner="owner" :title="title" :error="error" workspace size="large" @close="emit('close')" @escape="emit('close')">
    <div class="md-version-preview" data-md-version-preview>
      <QuireSegmented v-model="tab" :items="tabs" :label="title" size="sm" />
      <p v-if="!content && !error" class="md-version-preview__note">{{ text.loading }}</p>
      <div v-else-if="content && tab === 'preview'" class="md-version-preview__document">
        <MdEditor :markdown="content.value" :locale="locale" read-only :toolbar="false" :block-controls="false" :slash-menu="false" :comments="false" layout="embedded" />
      </div>
      <template v-else-if="content">
        <p class="md-version-preview__note">{{ patch ? text.compareHint : text.same }}</p>
        <QuireDiffViewer v-if="patch" :patch="patch" :label="text.compare" default-view="diff" :max-height="480" />
      </template>
      <p v-if="content && props.controller()" class="md-version-preview__note">{{ text.restoreHint }}</p>
    </div>
    <template #footer>
      <QuireButton variant="ghost" @click="emit('close')">{{ text.close }}</QuireButton>
      <QuireButton variant="ghost" :disabled="!content" @click="copy">{{ copied ? text.copied : text.copy }}</QuireButton>
      <QuireButton v-if="props.controller()" variant="solid" :disabled="!content" :loading="busy" @click="restore">{{ text.restore }}</QuireButton>
    </template>
  </DialogSurface>
</template>
<style scoped>
.md-version-preview { display: grid; gap: var(--qk-space-group); min-width: 0; }
.md-version-preview__note { margin: 0; font-size: var(--qk-type-helper-font-size); color: var(--qk-color-text-secondary); }
.md-version-preview__document { max-height: 60vh; overflow: auto; border: 1px solid var(--qk-color-border-subtle); border-radius: var(--qk-radius-control); }
</style>
