<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { QuireIcon } from "@quirekit/ui/vue";
import type { BlockWebLinkMetadata } from "../../web-card/types";
import { webLinkTitle } from "../../web-card/metadata";
const props = defineProps<{
  /** Valid portable information, independent of selection or playback. */ metadata: BlockWebLinkMetadata;
}>();
const coverFailed = ref(false), iconFailed = ref(false);
const domain = computed(() => new URL(props.metadata.url).hostname.replace(/^www\./u, ""));
watch(() => props.metadata.cover, () => { coverFailed.value = false; });
watch(() => props.metadata.icon, () => { iconFailed.value = false; });
</script>
<template>
  <div class="qk-rich-web-card">
    <img v-if="metadata.cover && !coverFailed" class="qk-rich-web-card__cover" :src="metadata.cover" alt="" loading="lazy" referrerpolicy="no-referrer" @error="coverFailed = true" />
    <div v-else class="qk-rich-web-card__identity" aria-hidden="true">
      <img v-if="metadata.icon && !iconFailed" :src="metadata.icon" alt="" referrerpolicy="no-referrer" @error="iconFailed = true" />
      <QuireIcon v-else name="link" :size="20" />
    </div>
    <div class="qk-rich-web-card__text">
      <strong>{{ webLinkTitle(metadata) }}</strong>
      <p v-if="metadata.description">{{ metadata.description }}</p>
      <span class="qk-rich-web-card__source">
        <img v-if="metadata.cover && metadata.icon && !iconFailed" :src="metadata.icon" alt="" referrerpolicy="no-referrer" @error="iconFailed = true" />{{ domain }}
      </span>
    </div>
    <QuireIcon class="qk-rich-web-card__external" name="externalLink" :size="16" />
  </div>
</template>
