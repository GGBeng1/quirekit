<script setup lang="ts">
import { computed, useId } from "vue";

/** Inspector 内一个属性分区的公开属性。 */
interface Props {
  /** 分区的可见标题。 */
  readonly title: string;
  /** 标题下方的可选说明。 */
  readonly description?: string;
  /** 标题旁的简短状态文本。 */
  readonly statusText?: string;
  /** 可选的稳定 section id。 */
  readonly id?: string;
}

/** Inspector 分区的内容位置。 */
interface Slots {
  /** 分区拥有的字段或属性控件。 */
  readonly default: () => unknown;
  /** 分区标题右侧的局部动作。 */
  readonly actions?: () => unknown;
}

const props = defineProps<Props>();
defineSlots<Slots>();

const instanceId = useId();
const rootId = computed(() => props.id ?? instanceId);
const titleId = computed(() => `${rootId.value}-title`);
</script>

<template>
  <section :id="rootId" class="qk-inspector__section" :aria-labelledby="titleId">
    <header class="qk-inspector__section-header">
      <span class="qk-inspector__section-heading">
        <h3 :id="titleId" class="qk-inspector__section-title">{{ title }}</h3>
        <span v-if="statusText" class="qk-inspector__section-status">{{ statusText }}</span>
      </span>
      <span v-if="$slots.actions" class="qk-inspector__section-actions"><slot name="actions" /></span>
    </header>
    <p v-if="description" class="qk-inspector__section-description">{{ description }}</p>
    <div class="qk-inspector__section-body"><slot /></div>
  </section>
</template>
