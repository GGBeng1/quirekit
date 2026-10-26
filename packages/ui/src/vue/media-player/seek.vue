<script setup lang="ts">
import { Slider } from "@ark-ui/vue/slider";
import { computed, ref, watch } from "vue";
import { useQuireKitMessages } from "../locale-provider/context";
import { mediaTime } from "./time";
const props = defineProps<{
  /** Current native position. */ time: number;
  /** Finite duration, zero when unknown. */ duration: number;
  /** Resource cannot currently be sought. */ disabled?: boolean;
}>();
const emit = defineEmits<{ /** User finished a pointer or keyboard adjustment. */ seek: [seconds: number] }>();
const text = useQuireKitMessages("mediaPlayer"), draft = ref<number | null>(null);
const current = computed(() => draft.value ?? props.time);
watch(() => props.duration, () => { draft.value = null; });
/** @param values - Ark's committed thumb values; media events cannot move an active draft. */
function commit(values: number[]): void { emit("seek", values[0] ?? 0); draft.value = null; }
</script>
<template>
  <div class="qk-media-player__timeline">
    <Slider.Root class="qk-media-player__seek" :model-value="[current]" :min="0" :max="duration||1" :step="0.1" :large-step="5" :disabled="disabled||!duration" :thumb-size="{width:8,height:8}" @update:model-value="draft=$event[0]??0" @value-change-end="commit($event.value)">
      <Slider.Control class="qk-slider__control">
        <Slider.Track class="qk-media-player__track"><Slider.Range class="qk-slider__range" /></Slider.Track>
        <Slider.Thumb :index="0" class="qk-media-player__thumb" :aria-label="text.seek" :aria-valuetext="`${mediaTime(current)} / ${mediaTime(duration)}`"><Slider.HiddenInput /></Slider.Thumb>
      </Slider.Control>
    </Slider.Root>
    <span class="qk-media-player__time" aria-hidden="true">{{mediaTime(current)}}<span> / {{duration?mediaTime(duration):'--:--'}}</span></span>
  </div>
</template>
