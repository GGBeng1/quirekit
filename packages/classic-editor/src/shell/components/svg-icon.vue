<script setup lang="ts">
import { QuireIcon } from "@quirekit/ui/vue";
import { computed } from "vue";
import {
  classicEditorIconRegistry,
  resolveClassicEditorIconData
} from "../../icons";

/** Inputs for one private SVG icon renderer. */
interface SvgIconProps {
  /** Stable icon catalog name. */
  readonly name: string;
  /** Optional runtime color applied to reviewed accent geometry. */
  readonly accentColor?: string | undefined;
  /** Whether stateful artwork should expose its empty-state mark. */
  readonly empty?: boolean | undefined;
}

const props = withDefaults(defineProps<SvgIconProps>(), {
  accentColor: undefined,
  empty: false
});
const resolvedIcon = computed(() => {
  return {
    data: resolveClassicEditorIconData(props.name),
    isFallback: !classicEditorIconRegistry.has(props.name)
  };
});
</script>

<template>
  <span
    class="qk-classic-editor__icon"
    :data-icon="name"
    :data-icon-fallback="resolvedIcon.isFallback ? 'true' : undefined"
    aria-hidden="true"
  >
    <QuireIcon
      :data="resolvedIcon.data"
      :accent-color="accentColor"
      :empty="empty"
    />
  </span>
</template>
