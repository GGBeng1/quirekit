<script setup lang="ts">
import { DatePicker } from '@ark-ui/vue/date-picker';
import { vContentMotion } from '../shared/motion/content';
import CalendarNavigation from './navigation.vue';
defineProps<{
  /** Keep a noninteractive heading for readonly/disabled calendars. */ staticHeading?: boolean;
  /** Visible month count. */ numberOfMonths: number;
}>();
</script>
<template>
  <DatePicker.View view="day" class="qk-calendar__view">
    <CalendarNavigation :static-heading="staticHeading ?? false" />
    <DatePicker.Context v-slot="calendar">
      <div v-content-motion="calendar.visibleRangeText.start" class="qk-calendar__months">
        <div v-for="index in numberOfMonths" :key="index" class="qk-calendar__month">
          <p v-if="numberOfMonths > 1" class="qk-calendar__month-label">{{ calendar.getOffset({ months: index - 1 }).visibleRangeText.start }}</p>
          <DatePicker.Table :aria-label="calendar.getOffset({ months: index - 1 }).visibleRangeText.start" class="qk-calendar__table">
            <DatePicker.TableHead><DatePicker.TableRow>
              <DatePicker.TableHeader v-for="day in calendar.weekDays" :key="day.long" :abbr="day.long" class="qk-calendar__weekday">{{ day.narrow }}</DatePicker.TableHeader>
            </DatePicker.TableRow></DatePicker.TableHead>
            <DatePicker.TableBody>
              <DatePicker.TableRow v-for="(week, row) in calendar.getOffset({ months: index - 1 }).weeks" :key="row">
                <DatePicker.TableCell v-for="day in week" :key="day.toString()" :value="day" :visible-range="calendar.getOffset({ months: index - 1 }).visibleRange" class="qk-calendar__cell">
                  <DatePicker.TableCellTrigger v-if="numberOfMonths === 1 || day.month === calendar.getOffset({ months: index - 1 }).visibleRange.start.month" class="qk-calendar__day qk-calendar__button">{{ day.day }}</DatePicker.TableCellTrigger>
                </DatePicker.TableCell>
              </DatePicker.TableRow>
            </DatePicker.TableBody>
          </DatePicker.Table>
        </div>
      </div>
    </DatePicker.Context>
  </DatePicker.View>
</template>
