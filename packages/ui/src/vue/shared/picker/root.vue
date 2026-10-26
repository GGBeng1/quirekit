<script setup lang="ts">
import { Popover } from '@ark-ui/vue/popover';
import { computed, provide, ref, watch } from 'vue';
import DrawerRoot from '../../drawer/root.vue';
import { useAdaptivePresentation } from '../task/presentation/use-adaptive-presentation';
import { pickerSurfaceKey } from './context';
import { pickerPositioning } from './positioning';
import type { PickerSurfaceProps } from './types';
const props = withDefaults(defineProps<PickerSurfaceProps>(), { presentation: 'auto', openOnFocus: true, disabled: false });
const emit = defineEmits<{ /** Requests the owning picker's visibility update. */ 'update:open': [open: boolean] }>();
const anchor = ref<HTMLElement>();
const positioning = pickerPositioning(() => anchor.value);
const presentation = useAdaptivePresentation(anchor, () => props.presentation);
const bottom = computed(() => presentation.resolved.value === 'bottom');
let ignoreFocusUntil = 0;
const fieldFocus = ref<HTMLElement>();
watch([() => props.open, presentation.ready], ([open], previous) => {
  if (open) presentation.open();
  else { presentation.close(); fieldFocus.value = undefined; if (previous?.[0]) ignoreFocusUntil = Date.now() + 200; }
}, { immediate: true, flush: 'sync' });
/** @param next - Visibility requested by one active physical shell. */
function change(next: boolean): void { if (!next || !props.disabled) emit('update:open', next); }
/** @param event - Real field activation; clear and trigger buttons keep their own behavior. */
function openField(event: Event): void {
  const target = event.target as HTMLElement | null;
  if (target?.closest('button')) { ignoreFocusUntil = Date.now() + 200; return; }
  if (!props.openOnFocus || props.disabled || props.open || !target || (event.type === 'focusin' && Date.now() < ignoreFocusUntil)) return;
  if (!target.closest('[role="spinbutton"], [data-part="control"]')) return;
  presentation.resolveForEvent(event);
  if (bottom.value && event.type === 'pointerdown') event.preventDefault();
  fieldFocus.value = bottom.value ? undefined : target.closest<HTMLElement>('[role="spinbutton"]') ?? undefined;
  change(true);
}
/** @param event - Dismissable-layer event; input segments are part of this picker. */
function guardOutside(event: CustomEvent<{ originalEvent: Event }>): void {
  const target = event.detail.originalEvent.target as Node | null;
  if (target && anchor.value?.contains(target)) event.preventDefault();
}
/** @returns The field for editing, or the explicit opening target in the panel. */
function initialFocus(): HTMLElement | null { return fieldFocus.value ?? props.initialFocusEl?.() ?? null; }
/** @returns The resident action after either shell dismisses. */
function finalFocus(): HTMLElement | null { return props.finalFocusEl?.() ?? null; }
provide(pickerSurfaceKey, { anchor, bottom, open: computed(() => props.open), openField });
</script>
<template>
  <!-- One presence provider owns the active shell; nesting the closed drawer would
       hide desktop Popover.Content through Ark's shared presence context. -->
  <DrawerRoot v-if="bottom" :open="open" side="bottom" :drag-enabled="false" :initial-focus-el="initialFocus" :final-focus-el="finalFocus"
    @update:open="change" @exit-complete="presentation.completeExit('bottom', presentation.epoch.value)">
    <slot />
  </DrawerRoot>
  <Popover.Root v-else portalled :open="open" :auto-focus="true" :initial-focus-el="initialFocus" :final-focus-el="finalFocus" :positioning="positioning"
    @interact-outside="guardOutside" @update:open="change" @exit-complete="presentation.completeExit('desktop', presentation.epoch.value)">
    <slot />
  </Popover.Root>
</template>
