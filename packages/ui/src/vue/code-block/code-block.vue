<script setup lang="ts">
import { computed, ref, shallowRef, useId, watch } from "vue";
import { QuireClipboard } from "../clipboard";
import QuireIcon from "../icon/icon.vue";
import { quireKitEditorIconData } from "../../components/icon/catalog";
import CodeLines from "./code-lines.vue";
import QuireCodeBlockHeader from "./code-block-header.vue";
import CodeBlockThemeSurface from "./theme-surface.vue";
import { codeBlockColors } from "./appearance";
import { useQuireKitMessages } from "../locale-provider/context";
import type { QuireKitClipboardErrorDetails } from "../../components/clipboard";
import type {
  QuireKitCodeBlockProps,
  QuireKitCodeBlockSlotProps,
  QuireKitCodeBlockLineSlotProps,
  QuireKitCodeBlockNavigationSlotProps,
  QuireKitCodeBlockActionsSlotProps,
} from "./types";
defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<QuireKitCodeBlockProps>(), {
  collapsed: undefined,
  variant: "soft", density: "regular", header: true, scheme: "auto",
  lineNumbers: false, startLine: 1, highlightedLines: () => [], addedLines: () => [], removedLines: () => [],
  copy: true,
  maxHeight: 400,
  wrap: false,
  collapsible: false,
  defaultCollapsed: true,
});
const text = useQuireKitMessages("codeBlock");
const emit = defineEmits<{
  /** Requests a controlled collapse change. */
  "update:collapsed": [value: boolean];
  /** The system clipboard successfully received the original source. */
  copy: [];
  /** Clipboard write failed; the public Clipboard trigger retains retry feedback. */
  copyError: [details: QuireKitClipboardErrorDetails];
}>();
const slots = defineSlots<{
  /** Replace the filename and language with a custom title. */
  title?: () => unknown;
  /** Additional controls before the built-in copy action. */
  actions?: (props: QuireKitCodeBlockActionsSlotProps) => unknown;
  /** Navigation above the title and code, such as externally controlled Tabs. */
  navigation?: (props: QuireKitCodeBlockNavigationSlotProps) => unknown;
  /** Trusted token spans within the built-in line renderer. */
  line?: (props: QuireKitCodeBlockLineSlotProps) => unknown;
  /** Complete code element from a trusted highlighter; source text remains the copy authority. */
  code?: (props: QuireKitCodeBlockSlotProps) => unknown;
}>();
const localCollapsed = ref(props.defaultCollapsed);
const isCollapsed = computed(
  () => props.collapsible && (props.collapsed ?? localCollapsed.value)
);
const viewport = shallowRef<HTMLElement | null>(null);
const trigger = shallowRef<HTMLButtonElement | null>(null);
const showHeader = computed(() => props.header || props.collapsible || !!slots.title || !!slots.actions);
const renderLines = computed(() => props.lineNumbers || props.highlightedLines?.length || props.addedLines?.length || props.removedLines?.length || !!slots.line);
const viewportId = `qk-code-${useId()}`;
const height = computed(
  () =>
    `${
      Number.isFinite(props.maxHeight) ? Math.max(48, props.maxHeight) : 400
    }px`
);
watch(isCollapsed, (collapsed) => {
  // A controlled collapse must not leave keyboard focus inside hidden source content.
  if (
    collapsed &&
    viewport.value?.contains(viewport.value.ownerDocument.activeElement)
  )
    trigger.value?.focus();
});
/** Toggles local state and notifies controlled consumers through one action. */
function toggle(): void {
  const next = !isCollapsed.value;
  localCollapsed.value = next;
  emit("update:collapsed", next);
}
</script>
<template>
  <CodeBlockThemeSurface :scheme="scheme" class="qk-code-block" data-qk-not-prose :data-variant="variant" :data-density="density"
    :data-qk-scheme="scheme === 'auto' ? undefined : scheme" v-bind="$attrs">
    <div v-if="$slots.navigation" class="qk-code-block__navigation"><slot name="navigation" :content-id="`${viewportId}-panel`" /></div>
    <div :id="`${viewportId}-panel`" class="qk-code-block__frame" :role="$slots.navigation ? 'tabpanel' : undefined"
      :aria-label="$slots.navigation ? ariaLabel ?? filename ?? language ?? text.code : undefined">
    <QuireCodeBlockHeader v-if="showHeader" :code="code" :language="language" :filename="filename"
      :copy="copy" @copy="emit('copy')" @copy-error="emit('copyError', $event)">
      <template v-if="$slots.title" #title><slot name="title" /></template>
      <template #actions>
        <slot name="actions" :content-props="scheme === 'auto' ? {} : { 'data-qk-scheme': scheme, style: codeBlockColors[scheme] }" />
        <button
          v-if="collapsible"
          ref="trigger"
          type="button"
          class="qk-code-block__toggle"
          :aria-controls="viewportId"
          :aria-expanded="!isCollapsed"
          :aria-label="isCollapsed ? text.expand : text.collapse"
          :title="isCollapsed ? text.expand : text.collapse"
          @click="toggle"
        >
          <QuireIcon :data="isCollapsed ? quireKitEditorIconData.chevronRight : quireKitEditorIconData.chevronDown" />
        </button>
      </template>
    </QuireCodeBlockHeader>
    <div v-else-if="copy" class="qk-code-block__floating">
      <QuireClipboard :value="code" :target="text.copyTarget" mode="icon" variant="text"
        @status-change="emit('copy')" @copy-error="emit('copyError', $event)" />
    </div>
    <pre
      :id="viewportId"
      ref="viewport"
      class="qk-code-block__viewport"
      :class="{ 'qk-code-block__viewport--wrap': wrap }"
      :hidden="isCollapsed"
      :style="{ maxHeight: height }"
      tabindex="0"
      :aria-label="ariaLabel ?? filename ?? text.code"
    ><slot name="code" :code="code" :language="language"><CodeLines v-if="renderLines" :code="code" :line-numbers="lineNumbers" :start-line="startLine" :highlighted-lines="highlightedLines" :added-lines="addedLines" :removed-lines="removedLines"><template v-if="$slots.line" #line="line"><slot name="line" v-bind="line" /></template></CodeLines><code v-else>{{ code }}</code></slot></pre>
    </div>
  </CodeBlockThemeSurface>
</template>
