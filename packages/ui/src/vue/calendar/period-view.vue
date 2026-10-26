<script setup lang="ts">
import { DatePicker } from '@ark-ui/vue/date-picker';
import { vContentMotion } from '../shared/motion/content';
import CalendarNavigation from './navigation.vue';
defineProps<{
  /** Month or year selection view. */ view: 'month' | 'year';
  /** Keep a noninteractive heading for readonly/disabled calendars. */ staticHeading?: boolean;
}>();
</script>
<template>
  <DatePicker.View :view="view" class="qk-calendar__view">
    <CalendarNavigation :static-heading="staticHeading ?? false" />
    <DatePicker.Context v-slot="calendar">
      <DatePicker.Table v-content-motion="calendar.visibleRangeText.start" :aria-label="calendar.visibleRangeText.start" class="qk-calendar__table qk-calendar__periods">
        <DatePicker.TableBody>
          <DatePicker.TableRow v-for="(row, index) in (view === 'month' ? calendar.getMonthsGrid({ columns: 3, format: 'short' }) : calendar.getYearsGrid({ columns: 3 }))" :key="index">
            <DatePicker.TableCell v-for="cell in row" :key="cell.value" :value="cell.value" :columns="3" class="qk-calendar__cell">
              <DatePicker.TableCellTrigger class="qk-calendar__period qk-calendar__button">{{ cell.label }}</DatePicker.TableCellTrigger>
            </DatePicker.TableCell>
          </DatePicker.TableRow>
        </DatePicker.TableBody>
      </DatePicker.Table>
    </DatePicker.Context>
  </DatePicker.View>
</template>
