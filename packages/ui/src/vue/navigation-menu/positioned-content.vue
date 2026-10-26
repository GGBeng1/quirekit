<script setup lang="ts">
import { NavigationMenu } from '@ark-ui/vue/navigation-menu';
import { autoUpdate, computePosition, flip, offset, shift, size } from '@floating-ui/dom';
import { useTemplateRef, watchEffect } from 'vue';
import { containPointerLeave } from './interaction';

const props = withDefaults(defineProps<{ open: boolean; trigger: 'click' | 'hover'; side?: boolean; grid?: boolean; rich?: boolean }>(), { side: false, grid: false, rich: false });
const panel = useTemplateRef<HTMLDivElement>('panel');

// Ark owns navigation and dismissal. Floating UI only projects the existing
// trigger/content pair into viewport coordinates, including RTL and edge flips; only grid panels align with the whole bar.
watchEffect(onCleanup => {
  const content = panel.value;
  if (!props.open || !content) return;
  const triggerElement = content.ownerDocument.getElementById(content.getAttribute('aria-labelledby') ?? '');
  if (!triggerElement) return;
  const root = triggerElement.closest<HTMLElement>('[data-scope=navigation-menu][data-part=root]');
  const bar = root?.querySelector<HTMLElement>(':scope > [data-part=list]');
  const anchor = props.grid && bar ? bar : triggerElement;
  let active = true;
  const stop = autoUpdate(anchor, content, () => {
    const availableWidth = content.ownerDocument.documentElement.clientWidth - 16;
    const desiredWidth = props.side ? 240 : props.grid ? Math.min(768, root?.clientWidth ?? 768) : props.rich ? 384 : 240;
    content.style.width = `${Math.max(0, Math.min(desiredWidth, availableWidth))}px`;
    void computePosition(anchor, content, {
      placement: props.side ? (getComputedStyle(anchor).direction === 'rtl' ? 'left-start' : 'right-start') : 'bottom-start',
      strategy: 'fixed',
      middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 }), size({
        padding: 8,
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${Math.max(0, Math.min(availableHeight, content.ownerDocument.defaultView!.innerHeight * 0.7, 432))}px`;
        }
      })]
    }).then(({ x, y }) => {
      if (active) Object.assign(content.style, { left: `${x}px`, top: `${y}px`, visibility: 'visible' });
    });
  });
  onCleanup(() => { active = false; stop(); content.style.visibility = 'hidden'; });
}, { flush: 'post' });
</script>

<template>
  <NavigationMenu.Content as-child @pointerleave.capture="containPointerLeave($event, trigger)">
    <div ref="panel" :class="['qk-navigation-menu__panel', 'qk-navigation-menu__positioned', side && 'qk-navigation-menu__flyout', grid ? 'qk-navigation-menu__panel--grid' : rich && 'qk-navigation-menu__panel--rich']"><slot /></div>
  </NavigationMenu.Content>
</template>
