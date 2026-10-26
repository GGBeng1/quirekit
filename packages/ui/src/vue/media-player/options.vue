<script setup lang="ts">
import { QuireSelect } from "../select";
import { QuireSlider } from "../slider";
import { QuirePopoverRoot, QuirePopoverTrigger, QuirePopoverContent } from "../popover";
import { QuireIconButton } from "../button";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitMessages } from "../locale-provider/context";
import Action from "./action.vue";
const props = defineProps<{
  /** Native volume. */ volume: number;
  /** Native mute state. */ muted: boolean;
  /** Native playback speed. */ rate: number;
}>();
const emit = defineEmits<{
  /** Change volume. */ volume: [value: number];
  /** Toggle mute. */ mute: [];
  /** Change speed. */ rate: [value: number];
}>();
const text = useQuireKitMessages("mediaPlayer");
const rates = [0.5,0.75,1,1.25,1.5,2].map(value=>({value:String(value),label:`${value}×`}));
</script>
<template>
  <div class="qk-media-player__options">
    <QuirePopoverRoot placement="top" :aria-label="text.volume">
      <QuirePopoverTrigger as-child><Action :label="text.volume" :icon="muted||!volume?'volumeX':'volume2'" /></QuirePopoverTrigger>
      <QuirePopoverContent class="qk-media-player__volume">
        <QuireSlider :label="text.volume" :model-value="[muted?0:Math.round(volume*100)]" unit="%" @update:model-value="emit('volume',($event?.[0]??0)/100)" />
        <QuireIconButton :label="muted||!volume?text.unmute:text.mute" :aria-pressed="muted||!volume" @click="emit('mute')"><QuireIcon :name="muted||!volume?'volumeX':'volume2'" /></QuireIconButton>
      </QuirePopoverContent>
    </QuirePopoverRoot>
    <QuireSelect :label="text.speed" :model-value="String(props.rate)" :items="rates" variant="text" width="68px" content-width="96px" placement="top-end" @update:model-value="emit('rate',Number($event))" />
  </div>
</template>
