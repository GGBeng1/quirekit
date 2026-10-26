<script setup lang="ts">
import { Field, useFieldContext } from '@ark-ui/vue/field';
/** One optional field association inside a compound control. */
interface Props {
  /** Group-scoped identity, distinct from every sibling and composed action. */
  readonly value: string;
}
defineProps<Props>();
const field = useFieldContext();
</script>
<template>
  <Field.Item v-if="field" :value="value"><slot /></Field.Item>
  <slot v-else />
</template>
