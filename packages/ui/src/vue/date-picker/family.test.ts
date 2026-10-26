import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { describe, expect, it } from 'vitest';
import DatePicker from './date-picker.vue';
import type { QuireKitDatePickerProps } from './types';
import TimePicker from '../time-picker/time-picker.vue';

describe('unified picker entry points', () => {
  it.each([
    [{ defaultValue: '2026-09-07' }, 3],
    [{ range: '', defaultValue: { start: '2026-09-07', end: '2026-09-12' } }, 6],
    [{ showTime: '', defaultValue: '2026-09-07 09:30' }, 5],
    [{ range: '', showTime: '', defaultValue: { start: '2026-09-07 09:00', end: '2026-09-08 17:00' } }, 10],
    [{ presentation: 'bottom', range: '', showTime: '', defaultValue: { start: '2026-09-07 09:00', end: '2026-09-08 17:00' } }, 10]
  ] as const)('projects bare Boolean attributes to the correct date field model (%j)', async (props, segments) => {
    // An empty string is the runtime form of a bare Boolean attribute in a Vue template.
    const html = await renderToString(createSSRApp({ render: () => h(DatePicker, { label: 'Date', ...props } as unknown as QuireKitDatePickerProps<boolean> & Record<string, unknown>) }));
    expect(html.match(/role="spinbutton"/g)).toHaveLength(segments);
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('data-state="open"');
  });
  it.each(['auto', 'bottom'] as const)('uses range=true for pure times without date segments (%s)', async (presentation) => {
    const html = await renderToString(createSSRApp({ render: () => h(TimePicker, { label: 'Hours', range: true, presentation, defaultValue: { start: '09:00', end: '17:00' } }) }));
    expect(html.match(/role="spinbutton"/g)).toHaveLength(4);
    expect(html).not.toContain('data-segment="year"');
  });
});
