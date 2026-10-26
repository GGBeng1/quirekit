<script setup lang="ts">
import { QuireDialogRoot, QuireDialogContent, QuireTaskPanel } from "@quirekit/ui/vue";
const props = defineProps<{
  /** Explicit instance realm and focus destination. */ owner: HTMLElement;
  /** Current accessible task title. */ title: string;
  /** Recoverable product feedback. */ error?: string | undefined;
  /** Large editors retain their existing workspace. */ workspace?: boolean;
  /** Existing desktop dialog dimensions. */ size?: "medium" | "large";
  /** Desktop task's first input; bottom panels keep title focus until the user chooses a field. */ initialFocus?: (() => HTMLElement | null) | undefined;
}>();
const emit = defineEmits<{ /** One unchanged or committed task exit. */ close: []; /** Workspace's original Escape policy. */ escape: [event: KeyboardEvent] }>();
// Lock the consumer choice at opening; rotation must not remount an input draft.
const bottom = !props.workspace && !!props.owner.ownerDocument.defaultView?.matchMedia("(max-width: 767px)").matches;
</script>
<template>
  <QuireTaskPanel v-if="bottom" :open="true" :title="title" presentation="bottom" :anchor-el="() => owner" :final-focus-el="() => owner.querySelector('[contenteditable=true]')" @update:open="!$event && emit('close')">
    <div data-qk-not-prose><slot /><p v-if="error" role="alert" class="text-qk-danger-text">{{ error }}</p></div>
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </QuireTaskPanel>
  <QuireDialogRoot v-else :open="true" :restore-focus="false" v-bind="initialFocus ? { initialFocusEl: initialFocus } : {}" :close-on-interact-outside="false" @escape-key-down="emit('escape', $event)" @update:open="!$event && emit('close')">
    <QuireDialogContent :title="title" :size="size ?? 'medium'" :error-text="error ?? ''" data-qk-not-prose>
      <slot /><template v-if="$slots.footer" #footer><slot name="footer" /></template>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
