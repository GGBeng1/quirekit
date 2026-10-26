// @vitest-environment happy-dom
import { createApp, h, nextTick, type Component } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import QuireLocaleProvider from "../../locale-provider/locale-provider.vue";
import QuireCalendar from "../../calendar/calendar.vue";
import QuireDateInput from "../../date-input/date-input.vue";
import QuireTimeInput from "../../time-input/time-input.vue";
import QuireDatePicker from "../../date-picker/date-picker.vue";
import QuireDateRangePicker from "../../date-range-picker/date-range-picker.vue";
import QuireDateTimePicker from "../../date-time-picker/date-time-picker.vue";
import QuireDateTimeRangePicker from "../../date-time-range-picker/date-time-range-picker.vue";
import QuireTimePicker from "../../time-picker/time-picker.vue";
import QuireTimeRangePicker from "../../time-range-picker/time-range-picker.vue";

const han = /[\p{Script=Han}]/u;
const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts a component, optionally inside an English provider, and waits for portalled panels.
 * @param component - Component under test.
 * @param props - Component props.
 * @param locale - Provider language, or undefined for the built-in default.
 * @returns Rendered markup of the whole document body, including teleported panels.
 */
async function render(component: Component, props: Record<string, unknown>, locale?: string): Promise<string> {
  const host = document.createElement("div");
  document.body.append(host);
  const content = () => h(component, props);
  const app = createApp(() => locale === undefined ? content() : h(QuireLocaleProvider, { locale }, content));
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  for (let tick = 0; tick < 5; tick += 1) await nextTick();
  await new Promise(resolve => setTimeout(resolve, 0));
  return document.body.innerHTML;
}

describe("picker family language", () => {
  it("Calendar names navigation and states in the provider language", async () => {
    const html = await render(QuireCalendar, { label: "Schedule", defaultValue: "2026-09-07", defaultFocusedValue: "2026-09-07", timeZone: "UTC" }, "en");
    expect(html).toContain('aria-label="Previous month"');
    expect(html).toContain("Selected");
    expect(html).not.toMatch(han);
  });
  it("Calendar keeps Chinese without a provider", async () => {
    const html = await render(QuireCalendar, { label: "日程", defaultFocusedValue: "2026-09-07" });
    expect(html).toContain('aria-label="上个月"');
  });
  it("DateInput names its clear action, segments and bounds", async () => {
    const html = await render(QuireDateInput, { label: "Due", clearable: true, defaultValue: "2026-01-01", min: "2026-02-01" }, "en");
    expect(html).toContain('aria-label="Clear date"');
    expect(html).toContain('aria-label="Due year"');
    expect(html).toContain("Dates must be between 2026-02-01 and any.");
    expect(html).not.toMatch(han);
  });
  it("DateInput keeps Chinese without a provider", async () => {
    expect(await render(QuireDateInput, { label: "截止", clearable: true })).toContain('aria-label="清除日期"');
  });
  it("TimeInput names its clear action and day period", async () => {
    const html = await render(QuireTimeInput, { label: "Start", clearable: true, hourCycle: 12, defaultValue: "13:30" }, "en");
    expect(html).toContain('aria-label="Clear time"');
    expect(html).toContain('aria-label="Start AM or PM"');
    expect(html).toContain("PM");
    expect(html).not.toMatch(han);
  });
  it("DatePicker opens a calendar described in English", async () => {
    const html = await render(QuireDatePicker, { label: "Due", defaultValue: "2026-09-07", defaultOpen: true }, "en");
    expect(html).toContain('aria-label="Open Due calendar"');
    expect(html).not.toMatch(han);
  });
  it("DateRangePicker uses English endpoints, clear action and guidance", async () => {
    const html = await render(QuireDateRangePicker, { label: "Stay", placeholderValue: "2026-09-01", defaultOpen: true }, "en");
    expect(html).toContain('aria-label="Clear date range"');
    expect(html).toContain("Stay start date");
    expect(html).toContain("Choose both dates to apply the range.");
    expect(html).not.toMatch(han);
  });
  it("DateTimePicker uses English panel actions", async () => {
    const html = await render(QuireDateTimePicker, { label: "Meeting", placeholderValue: "2026-09-07 09:00:00", defaultOpen: true }, "en");
    expect(html).toContain('aria-label="Open Meeting date and time panel"');
    expect(html).toContain("Confirm");
    expect(html).toContain("Choose a date");
    expect(html).not.toMatch(han);
  });
  it("DateTimeRangePicker uses English endpoints and guidance", async () => {
    const html = await render(QuireDateTimeRangePicker, { label: "Trip", placeholderValue: "2026-09-07 09:00:00", defaultOpen: true }, "en");
    expect(html).toContain('aria-label="Clear date-time range"');
    expect(html).toContain("Trip start time");
    expect(html).toContain("Choose both complete date-times before confirming.");
    expect(html).not.toMatch(han);
  });
  it("TimePicker uses English columns and actions", async () => {
    const html = await render(QuireTimePicker, { label: "Alarm", hourCycle: 12, defaultOpen: true }, "en");
    expect(html).toContain('aria-label="Open Alarm time panel"');
    expect(html).toContain("Minute");
    expect(html).toContain("Now");
    expect(html).not.toMatch(han);
  });
  it("TimeRangePicker uses English endpoints and guidance", async () => {
    const html = await render(QuireTimeRangePicker, { label: "Shift", defaultOpen: true }, "en");
    expect(html).toContain('aria-label="Clear time range"');
    expect(html).toContain("Shift end time");
    expect(html).toContain("Choose both complete times before confirming.");
    expect(html).not.toMatch(han);
  });
  it("TimeRangePicker keeps Chinese without a provider", async () => {
    expect(await render(QuireTimeRangePicker, { label: "班次" })).toContain('aria-label="清除时间范围"');
  });
});
