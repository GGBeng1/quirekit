<script setup lang="ts">
import {
  QuireButton,
  QuireCheckbox,
  QuireEmptyState,
  QuireIcon,
  QuireInput,
  QuirePagination,
  QuireProgress,
  QuireSelect,
  QuireSeparator,
  QuireTypography
} from "@quirekit/ui/vue";
import type { QuireKitSelectItem } from "@quirekit/ui";
import { nextTick, ref, type HTMLAttributes } from "vue";
import type { ClassicEditorLocale } from "@classic/types";
import FontRow from "./font-row.vue";
import FontHubFeedback from "../feedback.vue";
import type { ClassicFontHubController, ClassicFontHubMessageResolver } from "../types";

const FONT_CATEGORY_LABELS: Readonly<
  Record<string, Readonly<Record<ClassicEditorLocale, string>>>
> = {
  display: { "zh-CN": "展示", en: "Display" },
  handwriting: { "zh-CN": "手写", en: "Handwriting" },
  monospace: { "zh-CN": "等宽", en: "Monospace" },
  sans: { "zh-CN": "无衬线", en: "Sans serif" },
  "sans-serif": { "zh-CN": "无衬线", en: "Sans serif" },
  serif: { "zh-CN": "衬线", en: "Serif" }
};

/** Inputs for the provider-neutral font catalog task. */
interface Props {
  /** Shared Font Hub business controller. */
  readonly hub: ClassicFontHubController;
  /** Active product locale. */
  readonly locale: ClassicEditorLocale;
  /** Resolved Font Hub copy. */
  readonly message: ClassicFontHubMessageResolver;
  /** Theme and overlay attributes forwarded to Select content. */
  readonly popupProps: HTMLAttributes;
  /** Stable language/script filter choices. */
  readonly scriptFilterOptions: readonly QuireKitSelectItem[];
}

const props = defineProps<Props>();
const catalogRows = ref<HTMLElement | null>(null);
const sample = ref("");
const showPreviewSettings = ref(false);
const sampleSize = ref("24");
const previewSizes = [18, 24, 32].map((value) => ({ value: String(value), label: `${value} px` }));

/**
 * Localizes common source-neutral font categories while preserving custom ones.
 *
 * @param category - Optional provider category token.
 * @returns Compact visible category label.
 */
function categoryLabel(category: string | undefined): string {
  if (category === undefined) return "";
  const label = FONT_CATEGORY_LABELS[category.toLocaleLowerCase("en-US")];
  if (label === undefined) return category;
  return label[props.locale] ?? label.en;
}

/**
 * Changes the catalog page and returns its independent result viewport to the top.
 *
 * @param value - Next one-based result page.
 * @returns Completion after the page has rendered.
 */
async function updateCatalogPage(value: number): Promise<void> {
  await props.hub.changePage(value);
  await nextTick();
  catalogRows.value?.scrollTo({ top: 0, left: 0 });
}

/**
 * Applies a language filter and returns the result viewport to its origin.
 *
 * @param value - Stable script-filter value.
 * @returns Completion after the filtered first page has rendered.
 */
async function updateScriptFilter(value: string): Promise<void> {
  await props.hub.changeScriptFilter(value);
  await nextTick();
  catalogRows.value?.scrollTo({ top: 0, left: 0 });
}
</script>

<template>
  <section
    class="qk-font-hub__panel qk-font-hub__panel--catalog"
    :aria-label="message('fontCatalog')"
  >
    <form class="qk-font-hub__catalog-controls" @submit.prevent="hub.searchFonts">
      <div class="qk-font-hub__search">
        <QuireInput
          v-model="hub.query.value"
          width="100%"
          clearable
          size="sm"
          :placeholder="message('searchFontPlaceholder')"
          :aria-label="message('searchFontPlaceholder')"
        >
          <template #leading><QuireIcon name="search" /></template>
        </QuireInput>
        <QuireButton
          type="submit"
          variant="outline"
          size="sm"
          :busy="hub.searching.value"
          :aria-busy="hub.searching.value"
        >
          {{ message("searchFonts") }}
        </QuireButton>
      </div>
      <div class="qk-font-hub__filters">
        <QuireSelect
          v-model="hub.selectedSourceId.value"
          width="100%"
          :content-props="popupProps"
          class="qk-font-hub__source-select"
          size="sm"
          :items="hub.catalogOptions.value"
          :placeholder="message('selectFontSource')"
          :label="message('selectFontSource')"
        />
        <QuireSelect
          width="100%"
          :content-props="popupProps"
          class="qk-font-hub__script-select"
          :model-value="hub.scriptFilter.value"
          size="sm"
          :items="scriptFilterOptions"
          :label="message('filterByLanguage')"
          @update:model-value="$event !== undefined && updateScriptFilter($event)"
        />
      </div>
    </form>

    <FontHubFeedback :message="hub.feedback.value" :tone="hub.feedbackTone.value" />

    <section class="qk-font-hub__catalog" :aria-label="message('searchResults')">
      <header class="qk-font-hub__result-heading">
        <QuireTypography variant="helper">
          {{
            hub.hasSearched.value && !hub.isRecommended.value
              ? hub.submittedQuery.value.trim()
                ? message("searchResults")
                : message("allFonts")
              : message("recommendedFonts")
          }}
          <template v-if="!hub.searching.value && !hub.needsConfiguration.value"
            >· {{ hub.totalResultCount.value }}{{ hub.totalIsExact.value ? "" : "+" }}</template
          >
        </QuireTypography>
        <div class="qk-font-hub__result-actions">
          <QuireButton
            v-if="hub.isRecommended.value"
            size="sm"
            variant="outline"
            :busy="hub.importingRecommended.value"
            :disabled="hub.addableRecommendedFamilies.value.length === 0"
            @click="hub.importRecommendedFonts"
          >
            {{ message("addRecommendedFonts") }}
          </QuireButton>
          <QuireButton
            size="sm"
            variant="ghost"
            :aria-expanded="showPreviewSettings"
            :title="message('fontPreviewHint')"
            @click="showPreviewSettings = !showPreviewSettings"
          >
            {{ message("fontPreviewText") }}
            <QuireIcon :name="showPreviewSettings ? 'chevronUp' : 'chevronDown'" />
          </QuireButton>
        </div>
      </header>
      <div v-if="showPreviewSettings" class="qk-font-hub__preview-controls">
        <QuireInput
          v-model="sample"
          size="sm"
          width="100%"
          :aria-label="message('fontPreviewText')"
          :placeholder="message('fontPreviewText')"
        />
        <QuireSelect
          v-model="sampleSize"
          size="sm"
          width="100%"
          :items="previewSizes"
          :label="message('fontPreviewSize')"
          :content-props="popupProps"
        />
      </div>
      <QuireSeparator decorative />

      <div ref="catalogRows" class="qk-font-hub__font-list" :aria-busy="hub.searching.value">
        <QuireEmptyState
          illustrated
          scene="search"
          v-if="hub.needsConfiguration.value"
          size="sm"
          :description="message('searchSourceFirst')"
        >
          <template #actions>
            <QuireButton size="sm" variant="outline" @click="hub.configureBrowsingSource">{{
              message("configureFontSource")
            }}</QuireButton>
          </template>
        </QuireEmptyState>
        <QuireEmptyState
          v-else-if="hub.catalogError.value"
          illustrated
          scene="search"
          size="sm"
          :title="message('fontSearchFailed')"
          :description="hub.catalogError.value"
        >
          <template #actions>
            <QuireButton size="sm" variant="outline" @click="hub.searchFonts">{{
              message("retryFontSearch")
            }}</QuireButton>
          </template>
        </QuireEmptyState>
        <div
          v-else-if="hub.searching.value"
          class="qk-font-hub__catalog-loading"
          role="status"
          :aria-label="message('searchingFonts')"
        >
          <QuireProgress
            shape="circle"
            size="sm"
            :model-value="null"
            :show-value="false"
            :label="message('searchingFonts')"
          />
        </div>
        <template v-else>
          <template
            v-for="family in hub.displayedResults.value"
            :key="family.sourceId + (family.familyId || family.family)"
          >
            <FontRow
              :family="family"
              :hub="hub"
              :locale="locale"
              :message="message"
              :category-label="categoryLabel(family.category)"
              :sample="sample"
              :size="sampleSize"
            />
            <QuireSeparator decorative />
          </template>
          <QuireEmptyState
            v-if="hub.displayedResults.value.length === 0"
            illustrated
            scene="search"
            class="qk-font-hub__catalog-empty"
            size="sm"
            :description="message('noFontResults')"
          >
            <template #actions>
              <QuireButton size="sm" variant="outline" @click="hub.clearFilters">{{
                message("clearFontFilters")
              }}</QuireButton>
            </template>
          </QuireEmptyState>
        </template>
      </div>

      <div v-if="hub.pageCount.value > 1" class="qk-font-hub__pagination">
        <QuirePagination
          :page="hub.page.value"
          :count="hub.pageCount.value"
          :page-size="1"
          :sibling-count="1"
          size="sm"
          @update:page="$event !== undefined && updateCatalogPage($event)"
        />
      </div>
    </section>
    <QuireCheckbox
      :checked="hub.downloadOnImport.value"
      :label="message('importAndDownload')"
      :title="message('fontHubNotice')"
      @update:checked="hub.downloadOnImport.value = $event === true"
    />
  </section>
</template>
