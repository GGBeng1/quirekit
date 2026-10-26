<script setup lang="ts">
import { DatePicker, useDatePickerContext } from '@ark-ui/vue/date-picker';
import QuireIcon from '../icon/icon.vue';
defineProps<{ /** Present the heading as text when it has no available action. */ staticHeading?: boolean }>();
const calendar = useDatePickerContext();
</script>
<template>
  <DatePicker.ViewControl class="qk-calendar__navigation">
    <DatePicker.PrevTrigger class="qk-calendar__navigation-button qk-calendar__button"><QuireIcon name="chevronLeft" :size="16" /></DatePicker.PrevTrigger>
    <span v-if="staticHeading || calendar.view === 'year'" class="qk-calendar__title qk-calendar__button"><DatePicker.RangeText /></span>
    <DatePicker.ViewTrigger v-else class="qk-calendar__heading qk-calendar__button"><DatePicker.RangeText /></DatePicker.ViewTrigger>
    <DatePicker.NextTrigger class="qk-calendar__navigation-button qk-calendar__button"><QuireIcon name="chevronRight" :size="16" /></DatePicker.NextTrigger>
  </DatePicker.ViewControl>
</template>
