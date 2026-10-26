<script setup lang="ts">
import { inject, onMounted, ref, watch } from 'vue';
import { pickerSurfaceKey } from './context';
const context = inject(pickerSurfaceKey)!;
const element = ref<HTMLElement>();
onMounted(() => { context.anchor.value = element.value; });
watch(element, value => { context.anchor.value = value; });
</script>
<template>
  <div ref="element" class="qk-picker__anchor" @focusin="context.openField" @click="context.openField" @pointerdown="context.bottom.value && context.openField($event)"><slot /></div>
</template>
