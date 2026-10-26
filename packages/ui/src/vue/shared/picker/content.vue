<script setup lang="ts">
import QuireThemePortal from "../../theme-provider/portal.vue";
import { computed, useAttrs } from 'vue';
import { Drawer } from '@ark-ui/vue/drawer';
import PopoverContent from '../../popover/content.vue';
import QuireIcon from '../../icon/icon.vue';
import { usePickerBottom } from './context';
import { useQuireKitMessages } from '../../locale-provider/context';
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
const bottom = usePickerBottom();
const text = useQuireKitMessages('picker');
// Desktop panel classes own anchor-dependent width and height; they must never
// constrain the full-width sheet, which has its own single content inset.
const sheetAttrs = computed(() => Object.fromEntries(Object.entries(attrs).filter(([key]) => !['class', 'show-arrow'].includes(key))));
</script>
<template>
  <Teleport v-if="bottom" to="body">
    <QuireThemePortal>
      <Drawer.Backdrop class="qk-drawer__backdrop" />
      <Drawer.Positioner class="qk-drawer__positioner qk-drawer__positioner--bottom">
        <Drawer.Content :draggable="false" class="qk-drawer__content qk-drawer__content--bottom qk-picker__sheet">
          <header class="qk-picker__sheet-header">
            <Drawer.Title class="qk-drawer__title">{{ attrs['aria-label'] }}</Drawer.Title>
            <Drawer.CloseTrigger class="qk-picker__close" :aria-label="text.close"><QuireIcon name="close" :size="16" /></Drawer.CloseTrigger>
          </header>
          <div v-bind="sheetAttrs" class="qk-picker__sheet-body"><slot :bottom="true" /></div>
        </Drawer.Content>
      </Drawer.Positioner>
    </QuireThemePortal>
  </Teleport>
  <PopoverContent v-else v-bind="attrs" :show-arrow="false"><slot :bottom="false" /></PopoverContent>
</template>
