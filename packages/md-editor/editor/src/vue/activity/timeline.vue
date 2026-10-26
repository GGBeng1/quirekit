<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { QuireAvatar, QuireButton, QuireSelect, QuireSwitch, QuireTimeline } from "@quirekit/ui/vue";
import { groupActivities, isSystemKind, type ActivityEvent, type ActivityGroup } from "@quirekit/edit-history";
import type { MdEditorLocale } from "../types";
import { describeActivity } from "./describe";
import { inlineDiff, type InlineDiffPart } from "./diff";
import { activityLabels } from "./labels";
import type { MdActivityTimelineProps } from "./types";
const props = defineProps<MdActivityTimelineProps>();
const text = computed(() => activityLabels[props.locale]);
const events = shallowRef<readonly ActivityEvent[]>([]);
const cursor = ref<string>();
const loading = ref(false), failed = ref(false);
const actor = ref("all"), system = ref(true), period = ref<"all" | "week" | "month">("all");
const expanded = ref(new Set<string>()), details = ref(new Set<string>());
const notice = ref<{ id: string; status: "approximate" | "deleted" | "unavailable" }>();
const actors = shallowRef(new Map<string, string>());
let generation = 0, stop: (() => void) | undefined;
const DAY_MS = 86_400_000;
const filter = computed(() => ({ ...(actor.value === "all" ? {} : { actors: [actor.value] }), system: system.value,
  ...(period.value === "all" ? {} : { since: new Date(Date.now() - (period.value === "week" ? 7 : 30) * DAY_MS).toISOString() }) }));
const days = computed(() => groupActivities(events.value));
const periods = computed(() => (["all", "week", "month"] as const).map(value => ({ value, label: text.value.periods[value] })));
const members = computed(() => [{ value: "all", label: text.value.everyone }, ...[...actors.value].map(([value, label]) => ({ value, label }))]);
const timeFormat = computed(() => new Intl.DateTimeFormat(props.locale, { hour: "2-digit", minute: "2-digit", hour12: false }));
const dayFormat = computed(() => new Intl.DateTimeFormat(props.locale, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }));

/** @param list - Newly loaded events. Records member names for the filter without listing every event. */
function remember(list: readonly ActivityEvent[]): void {
  const next = new Map(actors.value);
  for (const event of list) if (!next.has(event.actor.id)) next.set(event.actor.id, event.actor.name ?? event.actor.id);
  if (next.size !== actors.value.size) actors.value = next;
}
/** @param reset - Start a new listing for the current filter instead of continuing. */
async function load(reset: boolean): Promise<void> {
  const token = reset ? ++generation : generation;
  loading.value = true; failed.value = false;
  try {
    const page = await props.store.list({ documentId: props.documentId, limit: 50, filter: filter.value,
      ...(reset || !cursor.value ? {} : { cursor: cursor.value }), ...(props.viewer ? { viewer: props.viewer } : {}) });
    if (token !== generation) return;
    events.value = reset ? page.items : [...events.value, ...page.items];
    cursor.value = page.cursor; remember(page.items);
    if (reset) follow();
  } catch { if (token === generation) failed.value = true; }
  finally { if (token === generation) loading.value = false; }
}
/** Subscribes to events confirmed after the newest loaded one, when the store supports it. */
function follow(): void {
  stop?.();
  const latest = events.value[0]?.sequence ?? 0;
  stop = props.store.subscribe?.(props.documentId, latest, event => {
    if (filter.value.actors && !filter.value.actors.includes(event.actor.id)) return;
    if (!filter.value.system && isSystemKind(event.kind)) return;
    events.value = [event, ...events.value]; remember([event]);
  });
}
/** @param set - Toggled identities. @param id - Group or event identity. @returns A new set, so the view updates. */
function toggle(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (!next.delete(id)) next.add(id);
  return next;
}
const inline = new Map<string, readonly InlineDiffPart[] | null>();
/**
 * @param event - Event whose details are open.
 * @returns Inline runs, computed once per event; null when a side is missing or was cut at the size limit.
 */
function changes(event: ActivityEvent): readonly InlineDiffPart[] | null {
  if (!inline.has(event.id)) {
    const content = event.content;
    inline.set(event.id, content && !content.truncated && content.before !== undefined && content.after !== undefined ? inlineDiff(content.before, content.after) : null);
  }
  return inline.get(event.id)!;
}
/** @param event - Event to show in the document. */
function locate(event: ActivityEvent): void {
  if (!props.locate) return;
  const location = props.locate(event);
  notice.value = location.status === "exact" ? undefined : { id: event.id, status: location.status };
  if ("range" in location) props.reveal?.(location.range);
}
/** @param date - `YYYY-MM-DD`. @returns Localized calendar date. */
const dayLabel = (date: string): string => dayFormat.value.format(new Date(`${date}T00:00:00Z`));
/** @param event - Confirmed event. @returns Localized clock time. */
const timeLabel = (event: ActivityEvent): string => timeFormat.value.format(new Date(event.acceptedAt));
/** @param group - Display group. @param locale - Control language. @returns Timeline item fields. */
const item = (group: ActivityGroup, locale: MdEditorLocale) => ({ key: group.id, title: describeActivity(group.lead, locale), time: timeLabel(group.lead), dateTime: group.lead.acceptedAt });
watch(filter, () => load(true), { immediate: true });
watch(() => [props.store, props.documentId], () => { actors.value = new Map(); void load(true); });
onBeforeUnmount(() => { generation++; stop?.(); });
</script>
<template>
  <div class="md-activity" data-md-activity>
    <div class="md-activity__filters">
      <QuireSelect v-model="actor" :items="members" :label="text.member" size="sm" width="auto" />
      <QuireSelect v-model="period" :items="periods" :label="text.period" size="sm" width="auto" />
      <QuireSwitch v-model:checked="system" :label="text.system" size="sm" />
    </div>
    <p v-if="props.local" class="md-activity__note">{{ text.local }}</p>
    <p v-if="failed" class="md-activity__note" role="alert">{{ text.failed }} <QuireButton size="xs" variant="ghost" @click="load(true)">{{ text.retry }}</QuireButton></p>
    <p v-else-if="!loading && !events.length" class="md-activity__note">{{ text.empty }}</p>
    <section v-for="day in days" :key="day.date" class="md-activity__day">
      <h3 class="md-activity__date">{{ dayLabel(day.date) }}</h3>
      <QuireTimeline :items="day.groups.map(group => item(group, locale))" density="compact" :label="dayLabel(day.date)">
        <template #indicator="{ index }"><QuireAvatar size="xs" :name="day.groups[index]!.actor.name ?? day.groups[index]!.actor.id" :src="day.groups[index]!.actor.avatar" /></template>
        <template #title="{ index }">
          <span class="md-activity__name">{{ day.groups[index]!.actor.name ?? day.groups[index]!.actor.id }}</span>
          <component :is="props.locate ? 'button' : 'span'" :type="props.locate ? 'button' : undefined" class="md-activity__summary" @click="locate(day.groups[index]!.lead)">{{ describeActivity(day.groups[index]!.lead, locale) }}</component>
        </template>
        <template #content="{ index }">
          <template v-for="group in [day.groups[index]!]" :key="group.id">
            <div v-if="group.lead.content && details.has(group.lead.id)" class="md-activity__detail">
              <pre v-if="changes(group.lead)" data-side="inline"><span v-for="(part, key) in changes(group.lead)" :key="key" :data-change="part.type">{{ part.text }}</span></pre>
              <template v-else>
                <pre v-if="group.lead.content.before" data-side="before">{{ group.lead.content.before }}</pre>
                <pre v-if="group.lead.content.after" data-side="after">{{ group.lead.content.after }}</pre>
              </template>
            </div>
            <p v-if="notice && group.events.some(event => event.id === notice!.id)" class="md-activity__note" role="status">{{ text.location[notice.status] }}</p>
            <div class="md-activity__actions">
              <QuireButton v-if="group.lead.content" size="xs" variant="ghost" @click="details = toggle(details, group.lead.id)">{{ details.has(group.lead.id) ? text.hideDetail : text.detail }}</QuireButton>
              <QuireButton v-if="group.events.length > 1" size="xs" variant="ghost" :aria-expanded="expanded.has(group.id)" @click="expanded = toggle(expanded, group.id)">
                {{ expanded.has(group.id) ? text.collapse : text.expand(group.events.length - 1) }}
              </QuireButton>
            </div>
            <ol v-if="expanded.has(group.id)" class="md-activity__nested">
              <li v-for="event in group.events.slice(1)" :key="event.id">
                <time :datetime="event.acceptedAt">{{ timeLabel(event) }}</time>
                <component :is="props.locate ? 'button' : 'span'" :type="props.locate ? 'button' : undefined" class="md-activity__summary" @click="locate(event)">{{ describeActivity(event, locale) }}</component>
              </li>
            </ol>
          </template>
        </template>
      </QuireTimeline>
    </section>
    <QuireButton v-if="cursor" size="sm" variant="ghost" :loading="loading" @click="load(false)">{{ text.more }}</QuireButton>
  </div>
</template>
<style scoped>
.md-activity { display: grid; gap: var(--qk-space-group); padding: var(--qk-space-surface); min-width: 0; }
.md-activity__filters { display: flex; flex-wrap: wrap; align-items: center; gap: var(--qk-space-inline); }
.md-activity__note { margin: 0; font-size: var(--qk-type-helper-font-size); color: var(--qk-color-text-secondary); }
.md-activity__day { display: grid; gap: var(--qk-space-inline); }
.md-activity__date { margin: 0; font-size: var(--qk-type-body-font-size); font-weight: var(--qk-type-heading-font-weight); color: var(--qk-color-text-primary); }
.md-activity__name { margin-inline-end: var(--qk-space-inline); color: var(--qk-color-text-secondary); font-weight: inherit; }
.md-activity__summary { padding: 0; border: 0; background: none; font: inherit; color: var(--qk-color-text-primary); text-align: start; }
button.md-activity__summary { cursor: pointer; }
button.md-activity__summary:hover { color: var(--qk-color-text-accent); }
.md-activity__actions { display: flex; gap: var(--qk-space-inline-tight); margin-inline-start: calc(-1 * var(--qk-space-inline)); }
.md-activity__detail { display: grid; gap: var(--qk-space-inline-tight); }
.md-activity__detail pre { margin: 0; padding: var(--qk-space-inline); border-radius: var(--qk-radius-control); white-space: pre-wrap; overflow-wrap: anywhere;
  font: var(--qk-type-code-font-size) / var(--qk-type-code-line-height) var(--qk-type-code-font-family); max-height: 12em; overflow: auto; }
.md-activity__detail pre[data-side="before"] { background: var(--qk-color-danger-surface); text-decoration: line-through; text-decoration-color: var(--qk-color-text-tertiary); }
.md-activity__detail pre[data-side="after"] { background: var(--qk-color-success-surface); }
.md-activity__detail pre[data-side="inline"] { background: var(--qk-color-surface-subtle); }
.md-activity__detail [data-change="delete"] { background: var(--qk-color-danger-surface); color: var(--qk-color-danger-text); text-decoration: line-through; }
.md-activity__detail [data-change="insert"] { background: var(--qk-color-success-surface); color: var(--qk-color-success-text); }
.md-activity__nested { display: grid; gap: var(--qk-space-inline-tight); margin: 0; padding: 0; list-style: none; font-size: var(--qk-type-helper-font-size); }
.md-activity__nested li { display: flex; gap: var(--qk-space-inline); }
.md-activity__nested time { color: var(--qk-color-text-tertiary); font-variant-numeric: tabular-nums; }
</style>
