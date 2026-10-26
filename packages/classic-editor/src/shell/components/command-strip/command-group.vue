<script setup lang="ts">
import type { ResolvedClassicEditorCommandStripGroup } from "../../contribution/command-strip";
import { useClassicEditorShellContributions } from "../../composables/use/shell-contributions";
import type { ClassicEditorShellModel } from "../../types";
import { toRef } from "vue";
import ClassicEditorCommandAction from "./command-action.vue";

/** Inputs for one measured direct-action Command Strip group. */
interface ClassicEditorCommandGroupProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
  /** Resolved direct-action group. */
  readonly group: ResolvedClassicEditorCommandStripGroup;
  /** Current strip density. */
  readonly density: "compact" | "expanded";
}

defineEmits<{ executed: [] }>();
const props = defineProps<ClassicEditorCommandGroupProps>();
const { text } = useClassicEditorShellContributions(toRef(props, "model"));
</script>

<template>
  <section
    class="qk-classic-command-group"
    :data-command-group="group.id"
    :data-priority="group.priority"
    :aria-label="text(group.label)"
  >
    <div class="qk-classic-command-group__actions">
      <ClassicEditorCommandAction
        v-for="item in group.items"
        :key="item.id"
        :model="model"
        :contribution="item"
        :label="text(item.label)"
        :title="text(item.title ?? item.label)"
        :show-label="density === 'expanded'"
        @executed="$emit('executed')"
      />
    </div>
    <span v-if="density === 'expanded'" class="qk-classic-command-group__label">
      {{ text(group.label) }}
    </span>
  </section>
</template>
