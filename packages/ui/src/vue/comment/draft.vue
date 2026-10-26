<script setup lang="ts">
import { onMounted, shallowRef } from "vue";
import QuireAvatar from "../avatar/avatar.vue";
import QuireButton from "../button/button.vue";
import QuireCard from "../card/card.vue";
import { useQuireKitMessages } from "../locale-provider/context";
import CommentField from "./field.vue";
import type { QuireKitCommentDraftProps, QuireKitCommentMention } from "./types";

const props = withDefaults(defineProps<QuireKitCommentDraftProps>(), { busy: false, variant: "card", autofocus: true });
const emit = defineEmits<{
  /** The new comment was submitted, with the people mentioned in it. */ submit: [body: string, mentions: readonly QuireKitCommentMention[]];
  /** The draft was abandoned. */ cancel: [];
}>();
const text = useQuireKitMessages("comment"), body = shallowRef(""), field = shallowRef<InstanceType<typeof CommentField>>();
onMounted(() => { if (props.autofocus) field.value?.focus(); });

/** Submits a nonblank body; a plain draft stays in place and clears for the next comment. */
function submit(): void {
  if (props.busy || !body.value.trim()) return;
  emit("submit", body.value, field.value?.mentions() ?? []);
  if (props.variant === "plain") body.value = "";
}
/** Abandons the draft; a plain draft only clears its text. */
function cancel(): void { if (props.variant === "plain") body.value = ""; emit("cancel"); }
</script>

<template>
  <div v-if="variant === 'plain'" class="qk-comment-draft--plain" :aria-label="text.submit">
    <CommentField ref="field" v-model="body" :rows="1" :max-rows="6" :placeholder="placeholder ?? text.draftPlaceholder" :label="text.submit" :disabled="busy"
      :mentions="mentions" @submit="submit" @cancel="cancel" />
    <div v-if="body.trim()" class="qk-comment-thread__composer-actions">
      <small>{{ text.submitHint }}</small>
      <QuireButton variant="ghost" size="xs" :disabled="busy" @click="cancel">{{ text.cancel }}</QuireButton>
      <QuireButton color="primary" variant="solid" size="xs" :busy="busy" @click="submit">{{ text.submit }}</QuireButton>
    </div>
  </div>
  <QuireCard v-else as="section" variant="outline" density="compact" class="qk-comment-thread qk-comment-draft" data-active="" :aria-label="text.submit">
    <template v-if="author" #header>
      <div class="qk-comment-thread__header">
        <span class="qk-comment-thread__target">
          <QuireAvatar size="xs" :name="author.name" :src="author.avatar" />
          <strong class="qk-comment-thread__author">{{ author.name }}</strong>
        </span>
      </div>
    </template>
    <span v-if="quote" class="qk-comment-thread__quote" data-state="text" :title="quote">{{ quote }}</span>
    <template #footer>
      <div class="qk-comment-thread__composer">
        <CommentField ref="field" v-model="body" :rows="2" :max-rows="6" :placeholder="placeholder ?? text.draftPlaceholder" :label="text.submit" :disabled="busy"
          :mentions="mentions" @submit="submit" @cancel="cancel" />
        <div class="qk-comment-thread__composer-actions">
          <small>{{ text.submitHint }}</small>
          <QuireButton variant="ghost" size="xs" :disabled="busy" @click="cancel">{{ text.cancel }}</QuireButton>
          <QuireButton color="primary" variant="solid" size="xs" :busy="busy" :disabled="!body.trim()" @click="submit">{{ text.submit }}</QuireButton>
        </div>
      </div>
    </template>
  </QuireCard>
</template>
