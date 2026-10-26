<script setup lang="ts">
import { QuireButton, QuireEmptyState, QuireInput, QuireSeparator } from "@quirekit/ui/vue";
import { computed, ref, type HTMLAttributes } from "vue";
import type { ClassicEditorLocale } from "@classic/types";
import FontRow from "../catalog/font-row.vue";
import FontHubFeedback from "../feedback.vue";
import type { ClassicFontHubController, ClassicFontHubMessageResolver } from "../types";

/** Inputs for the imported-family management task. */
interface Props {
  /** Shared Font Hub business controller. */
  readonly hub: ClassicFontHubController;
  /** Resolved Font Hub copy. */
  readonly message: ClassicFontHubMessageResolver;
  /** Active display locale. */
  readonly locale: ClassicEditorLocale;
  /** Theme and overlay ownership forwarded to confirmation surfaces. */
  readonly popupProps: HTMLAttributes;
}

const props = defineProps<Props>();
const query = ref("");
const panel = ref<HTMLElement | null>(null);
/** @returns The surviving search field after removing a font row. */
function removalFocusEl(): HTMLElement | null {
  return panel.value?.querySelector("input") ?? null;
}
const families = computed(() =>
  props.hub.importedFamilies.value.filter((family) =>
    [family.family, family.displayName, family.sourceLabel].some((value) =>
      value?.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())
    )
  )
);
</script>

<template>
  <section ref="panel" class="qk-font-hub__panel" :aria-label="message('importedFonts')">
    <QuireInput
      v-model="query"
      width="min(320px, 100%)"
      size="sm"
      :aria-label="message('searchFontPlaceholder')"
      :placeholder="message('searchFontPlaceholder')"
    />
    <FontHubFeedback :message="hub.feedback.value" :tone="hub.feedbackTone.value" />

    <div v-if="families.length" class="qk-font-hub__font-list">
      <template
        v-for="family in families"
        :key="family.sourceId + (family.familyId || family.family)"
      >
        <FontRow
          :family="family"
          :hub="hub"
          :locale="locale"
          :message="message"
          :popup-props="popupProps"
          :removal-focus-el="removalFocusEl"
          category-label=""
          sample=""
          size="24"
          managed
        />
        <QuireSeparator decorative />
      </template>
    </div>
    <QuireEmptyState
      illustrated
      scene="search"
      v-else
      size="sm"
      :description="
        message(hub.importedFamilies.value.length ? 'noFontResults' : 'noImportedFonts')
      "
    >
      <template #actions>
        <QuireButton v-if="query" size="sm" variant="outline" @click="query = ''">{{
          message("clearFontFilters")
        }}</QuireButton>
        <QuireButton v-else size="sm" variant="outline" @click="hub.selectView('catalog')">{{
          message("fontCatalog")
        }}</QuireButton>
      </template>
    </QuireEmptyState>
  </section>
</template>
