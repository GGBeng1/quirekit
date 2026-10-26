<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import type { QuireKitMediaPlayerProps, QuireKitMediaPlaybackState } from "../../components/media-player";
import { QuireButton } from "../button";
import QuireIcon from "../icon/icon.vue";
import { QuireOverlayProvider } from "../overlay-provider";
import { useQuireKitMessages } from "../locale-provider/context";
import { useMediaPlayback } from "./playback";
import { useMediaFullscreen } from "./fullscreen";
import Action from "./action.vue";
import Seek from "./seek.vue";
import Options from "./options.vue";
const props = withDefaults(defineProps<QuireKitMediaPlayerProps>(), { kind: "audio", preload: "metadata" });
const emit = defineEmits<{
  /** Native state observations, never document edits. */ stateChange: [state: Readonly<QuireKitMediaPlaybackState>];
}>();
const root = shallowRef<HTMLElement>(), media = shallowRef<HTMLMediaElement | null>(null);
const player = useMediaPlayback(media), fullscreen = useMediaFullscreen(root), text = useQuireKitMessages("mediaPlayer");
const state = player.state;
const playLabel = computed(() => state.pending||state.playing?text.value.pause:state.ended?text.value.replay:text.value.play);
const playIcon = computed(() => state.pending||state.playing?"pause":state.ended?"rotateCcw":"play");
watch(() => ({...state}), value => emit("stateChange",value));
</script>
<template>
  <div ref="root" class="qk-media-player" :data-kind="kind" :data-playing="state.playing" :data-error="state.error||undefined" role="group" :aria-label="title" data-qk-not-prose contenteditable="false" @keydown.stop>
    <QuireOverlayProvider :target="root" strategy="fixed">
      <div v-if="kind==='video'" class="qk-media-player__header"><QuireIcon name="video" /><span class="qk-media-player__title" :title="title">{{title}}</span></div>
      <div :class="kind==='video'?'qk-media-player__stage':'qk-media-player__audio-source'">
        <component :is="kind" :key="`${kind}:${src}`" ref="media" :src="src" :preload="preload" :poster="kind==='video'?poster:undefined" playsinline class="qk-media-player__media" :aria-label="title" />
        <button v-if="kind==='video'&&!state.error" type="button" class="qk-media-player__picture-action" :aria-label="playLabel" tabindex="-1" @click="player.toggle"><span v-if="!state.playing" class="qk-media-player__picture-icon"><QuireIcon :name="playIcon" :size="24" /></span></button>
      </div>
      <div class="qk-media-player__body">
        <div v-if="kind==='audio'" class="qk-media-player__audio-heading"><span class="qk-media-player__title" :title="title">{{title}}</span></div>
        <div class="qk-media-player__controls">
          <Action :label="playLabel" :icon="playIcon" :primary="kind==='audio'" @click="player.toggle" />
          <Seek :time="state.time" :duration="state.duration" :disabled="state.error==='load'" @seek="player.seek" />
          <Options :volume="state.volume" :muted="state.muted" :rate="state.rate" @volume="player.setVolume" @mute="player.toggleMute" @rate="player.setRate" />
          <Action v-if="kind==='video'&&fullscreen.available.value" class="qk-media-player__fullscreen" :label="fullscreen.active.value?text.exitFullscreen:text.fullscreen" :icon="fullscreen.active.value?'minimize':'maximize'" @click="fullscreen.toggle" />
        </div>
        <div v-if="state.error||state.pending||state.waiting||fullscreen.failed.value" class="qk-media-player__status" role="status">
          <template v-if="state.error"><QuireIcon name="info" /><span>{{state.error==='blocked'?text.blocked:text.failed}}</span><QuireButton variant="outline" size="xs" @click="player.retry">{{text.retry}}</QuireButton></template>
          <template v-else-if="fullscreen.failed.value">{{text.fullscreenFailed}}</template>
          <template v-else>{{text.loading}}</template>
        </div>
      </div>
    </QuireOverlayProvider>
  </div>
</template>
