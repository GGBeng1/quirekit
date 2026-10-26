<script setup lang="ts">
import { useMindEditorMessages } from "../messages";
import { computed, ref } from "vue";
import { QuireButton, QuireIcon, QuireInput, QuireSelect } from "@quirekit/ui/vue";
import type { MindMapTemplateId } from "@quirekit/mind-map";
import type { MindEditorGalleryProps } from "./types";
import TemplatePreview from "./preview.vue";
const { t } = useMindEditorMessages();
const props = defineProps<MindEditorGalleryProps>();
const emit = defineEmits<{ /** Reviews a template without writing the current document. */ choose: [id: MindMapTemplateId] }>();
const category = ref("all"), query = ref("");
const categories = computed(() => [{ value: "all", label: t("allTemplates") }, { value: "style", label: t("styleTemplates") },
  { value: "work", label: t("workTemplates") }, { value: "life", label: t("lifeTemplates") }, { value: "analysis", label: t("analysisTemplates") }]);
const filtered = computed(() => props.templates.filter(template => (category.value === "all" || template.category === category.value)
  && `${template.title} ${template.description}`.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())));
</script>

<template>
  <section class="qk-mind-editor__gallery" :aria-label="t('library')" tabindex="-1">
    <div class="qk-mind-editor__gallery-heading"><h2>{{ t('startTemplate') }}</h2><span>{{ t('templateCount', { count: filtered.length }) }}</span></div>
    <div class="qk-mind-editor__gallery-filters">
      <QuireSelect v-model="category" :label="t('category')" :items="categories" size="sm" width="140px" />
      <QuireInput v-model="query" :aria-label="t('searchTemplates')" :placeholder="t('searchTemplates')" size="sm" width="100%" clearable><template #leading><QuireIcon name="search" /></template></QuireInput>
    </div>
    <div class="qk-mind-editor__gallery-scroll">
      <div class="qk-mind-editor__templates">
        <QuireButton v-for="template in filtered" :key="template.id" :aria-label="template.title" :aria-pressed="selected === template.id" variant="outline" :disabled="disabled" @click="emit('choose', template.id)">
          <span class="qk-mind-editor__template-card">
            <TemplatePreview :document="template.document" :renderer="renderer" :theme="theme" />
            <span class="qk-mind-editor__template-caption"><strong>{{ template.title }}</strong><small>{{ template.description }}</small></span>
          </span>
        </QuireButton>
      </div>
      <p v-if="!filtered.length" class="qk-mind-editor__gallery-empty">{{ t('noTemplates') }}</p>
    </div>
  </section>
</template>
