<script setup lang="ts">
import { computed, type PropType } from "vue";
import { QuireTag, QuireIcon } from "@quirekit/ui/vue";
import type { DataField, DataValue } from "@quirekit/data-view";
import { formatDataValue } from "@quirekit/data-view";
import { optionColor } from "../shared/presentation";
const props = defineProps({field: {type: Object as PropType<DataField>, required: true}, value: {type: null as unknown as PropType<DataValue>, required: true}});
const options = computed(() => "options" in props.field ? props.field.options.filter(option => Array.isArray(props.value) ? props.value.includes(option.id) : props.value === option.id) : []);
</script>
<template>
  <span v-if="options.length" class="dv-cell-tags"><QuireTag v-for="option in options" :key="option.id" :color="optionColor(option)" size="sm" variant="soft">{{ option.label }}</QuireTag></span>
  <span v-else-if="field.type === 'boolean' && value !== null" class="dv-boolean"><QuireIcon :name="value ? 'check' : 'minus'" :size="16" /><span>{{ value ? '是' : '否' }}</span></span>
  <span v-else :class="{'dv-cell-empty': value === null || value === '' || Array.isArray(value) && !value.length}">{{ formatDataValue(field, value) || '空白' }}</span>
</template>
