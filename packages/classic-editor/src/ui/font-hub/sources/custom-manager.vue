<script setup lang="ts">
import {
  QuireButton,
  QuireCard,
  QuireTypography
} from "@quirekit/ui/vue";
import { computed, ref, type HTMLAttributes } from "vue";
import type {
  ClassicEditorFontLibrary,
  ClassicEditorLocale,
  ClassicEditorWebFontSource
} from "@classic/types";
import type { ClassicFontHubMessageResolver } from "../types";
import FontHubFeedback from "../feedback.vue";
import SourceConnectionDialog from "./connection-dialog.vue";

/** Explicitly connected static or protocol-backed font directories. */
interface Props {
  /** Library owns validation, enablement and persistence. */
  readonly library?: ClassicEditorFontLibrary | undefined;
  /** Active display language. */
  readonly locale: ClassicEditorLocale;
  /** Product message resolver. */
  readonly message: ClassicFontHubMessageResolver;
  /** Reactive library source snapshot. */
  readonly sources: readonly ClassicEditorWebFontSource[];
  /** Select overlay ownership attributes. */
  readonly popupProps: HTMLAttributes;
  /** Optional owner-document portal target for the source dialog. */
  readonly dialogPortalTarget?: HTMLElement | undefined;
  /** Opens the selected user-connected directory in the catalog. */
  readonly browseSource: (id: string) => void;
}
const props = defineProps<Props>();
const feedback = ref("");
const tone = ref<"error" | "success">("success");
const en = computed(() => props.locale === "en");
const customSources = computed(() => props.sources.filter((source) => source.kind === "custom"));

/** Reports a completed connection without retaining form state in the list view. */
function sourceEnabled(): void {
  tone.value = "success";
  feedback.value = props.message("sourceEnabled");
}

/**
 * Removes a source without deleting independently added fonts.
 * @param id - Exact user-enabled source identity.
 */
function removeSource(id: string): void {
  feedback.value = "";
  try {
    props.library?.removeCustomSource?.(id);
    tone.value = "success";
    feedback.value = props.message("sourceRemoved");
  } catch (error) {
    tone.value = "error";
    feedback.value = String(error instanceof Error ? error.message : error);
  }
}
</script>

<template>
  <section class="qk-font-hub__custom-sources">
    <div class="qk-font-hub__settings-footer">
      <QuireTypography variant="helper">{{
        en
          ? "Built-in catalogs are ready to browse. Connect your own below."
          : "内置来源可直接浏览，也可连接自己的字体服务。"
      }}</QuireTypography>
      <SourceConnectionDialog
        :library="library"
        :locale="locale"
        :message="message"
        :popup-props="popupProps"
        :portal-target="dialogPortalTarget"
        @enabled="sourceEnabled"
      />
    </div>
    <QuireCard
      v-for="source in customSources"
      :key="source.id"
      variant="outline"
      density="compact"
      :description="source.descriptorUrl ?? ''"
    >
      <template #title
        ><QuireTypography variant="control">{{ source.label[locale] }}</QuireTypography></template
      >
      <template #trailing
        ><div class="qk-font-hub__row-actions">
          <QuireButton size="sm" variant="ghost" color="danger" @click="removeSource(source.id)">{{
            message("removeFontSource")
          }}</QuireButton>
          <QuireButton size="sm" variant="outline" @click="browseSource(source.id)">{{
            en ? "Browse fonts" : "浏览字体"
          }}</QuireButton>
        </div></template
      >
    </QuireCard>
    <FontHubFeedback :message="feedback" :tone="tone" />
  </section>
</template>
