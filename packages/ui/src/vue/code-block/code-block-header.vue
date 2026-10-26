<script setup lang="ts">
import { QuireClipboard } from "../clipboard";
import type { QuireKitClipboardErrorDetails } from "../../components/clipboard";
import { useQuireKitMessages } from "../locale-provider/context";
import type { QuireKitCodeBlockHeaderProps } from "./types";
withDefaults(defineProps<QuireKitCodeBlockHeaderProps>(), { code: "", copy: true });
const text = useQuireKitMessages("codeBlock");
const emit = defineEmits<{
  /** Clipboard write succeeded. */ copy: [];
  /** Clipboard read or write failed; the same control allows retry. */ copyError: [details: QuireKitClipboardErrorDetails];
}>();
defineSlots<{
  /** Replace the source title, for example with a language Select. */ title?: () => unknown;
  /** Actions before the shared copy control. */ actions?: () => unknown;
}>();
</script>
<template>
  <div class="qk-code-block__header" data-qk-not-prose>
    <div class="qk-code-block__title"><slot name="title">
      <span class="qk-code-block__filename">{{ filename || language || text.code }}</span>
      <span v-if="filename && language" class="qk-code-block__language">{{ language }}</span>
    </slot></div>
    <div class="qk-code-block__actions">
      <slot name="actions" />
      <QuireClipboard v-if="copy" :value="code" :get-value="getCode" :target="text.copyTarget" mode="icon" variant="text"
        @status-change="emit('copy')" @copy-error="emit('copyError', $event)" />
    </div>
  </div>
</template>
