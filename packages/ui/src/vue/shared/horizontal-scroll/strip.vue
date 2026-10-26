<script setup lang="ts">
import { shallowRef } from 'vue';
import QuireIconButton from '../../button/icon-button.vue';
import QuireIcon from '../../icon/icon.vue';
import { useHorizontalScroll } from './use-scroll';
import { scrollLeftIcon, scrollRightIcon } from './icons';
import { useQuireKitMessages } from '../../locale-provider/context';

const props = withDefaults(defineProps<{ /** Enable one native scroll row without remounting its items. */ enabled?: boolean;
  /** Accessible previous-page label; defaults to the attachment wording. */ previousLabel?: string;
  /** Accessible next-page label; defaults to the attachment wording. */ nextLabel?: string }>(), { enabled: false });
// Attachment and file lists are the strip's only owners, so their shared wording is the fallback.
const text = useQuireKitMessages('attachment');
const root = shallowRef<HTMLElement | null>(null);
const { viewport, content, overflowing, canPrevious, canNext, rtl, scrollPage, revealFocused, handleWheel, updateEdges } = useHorizontalScroll({
  root, enabled: () => props.enabled, direction: () => undefined,
  ownsFocus: target => target.closest('[data-qk-horizontal-strip]') === root.value
});
/** Keep the current editor focus during pointer scrolling; keyboard buttons stay focusable.
 * @param event - Pointer pressing a page control.
 */
function preserveFocus(event: PointerEvent): void { if (event.pointerType === 'mouse' && event.button === 0) event.preventDefault(); }
</script>
<template>
  <div ref="root" class="qk-horizontal-strip" data-qk-horizontal-strip :data-enabled="enabled" :data-overflow="overflowing" @focusin="revealFocused">
    <div ref="viewport" class="qk-horizontal-strip__viewport" @scroll.passive="updateEdges" @wheel="handleWheel">
      <div ref="content" class="qk-horizontal-strip__content"><slot /></div>
    </div>
    <QuireIconButton v-if="enabled && overflowing" class="qk-horizontal-strip__previous" shape="circle" size="xs" variant="outline"
      :label="previousLabel ?? text.previous" :disabled="!canPrevious" @pointerdown="preserveFocus" @click="scrollPage(-1)">
      <QuireIcon :data="rtl ? scrollRightIcon : scrollLeftIcon" :size="12" />
    </QuireIconButton>
    <QuireIconButton v-if="enabled && overflowing" class="qk-horizontal-strip__next" shape="circle" size="xs" variant="outline"
      :label="nextLabel ?? text.next" :disabled="!canNext" @pointerdown="preserveFocus" @click="scrollPage(1)">
      <QuireIcon :data="rtl ? scrollLeftIcon : scrollRightIcon" :size="12" />
    </QuireIconButton>
  </div>
</template>
