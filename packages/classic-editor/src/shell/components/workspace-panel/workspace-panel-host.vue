<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch
} from "vue";
import type { ComponentPublicInstance } from "vue";
import {
  QuireIcon,
  QuireIconButton,
  QuireInspector,
  QuireTooltipContent,
  QuireTooltipRoot,
  QuireTooltipTrigger
} from "@quirekit/ui/vue";
import { resolveClassicEditorText } from "@classic/localization";
import {
  ClassicEditorWorkspacePanelHostRuntime,
  projectClassicEditorWorkspacePanelHost,
  projectClassicEditorWorkspacePanelProduct
} from "@classic/runtime/workspace-panel";
import type {
  ClassicEditorRenderContext
} from "@classic/types";
import type {
  ClassicEditorWorkspacePanelContribution,
  ClassicEditorWorkspacePanelMountedRenderable,
  ClassicEditorWorkspacePanelSnapshot
} from "@classic/types/workspace-panel";
import { resolveWorkspacePanelMessages } from "./localization";

/** Inputs for the one root-local Workspace Panel host. */
interface ClassicEditorWorkspacePanelHostProps {
  /** Mounted product context projected into feature-owned panel content. */
  readonly context: ClassicEditorRenderContext;
  /** Direct typed plugin contributions discovered from workspace providers. */
  readonly contributions: readonly ClassicEditorWorkspacePanelContribution[];
}

const props = defineProps<ClassicEditorWorkspacePanelHostProps>();
const controller = new ClassicEditorWorkspacePanelHostRuntime();
const snapshot = shallowRef<ClassicEditorWorkspacePanelSnapshot>(controller.snapshot);
const panelSurface = ref<HTMLElement>();
const panelBody = ref<HTMLElement>();
const registrationCleanups = new Map<ClassicEditorWorkspacePanelContribution, () => void>();
let mountedContribution: ClassicEditorWorkspacePanelMountedRenderable | undefined;
let mountedEntryId: string | null = null;
let disposed = false;
let unsubscribePanel = controller.subscribe((next) => {
  snapshot.value = next;
});
let unsubscribeTasks: (() => void) | undefined;
let unsubscribeResources: (() => void) | undefined;

const active = computed(() => snapshot.value.active);
const locale = computed(() => props.context.locale);
const message = computed(() => resolveWorkspacePanelMessages(locale.value));
const title = computed(() => active.value === null
  ? ""
  : resolveClassicEditorText(active.value.contribution.title, locale.value));
const targetLabel = computed(() => active.value === null
  ? ""
  : resolveClassicEditorText(active.value.target.label, locale.value));
const freshnessLabel = computed(() => active.value === null
  ? ""
  : message.value.freshness[active.value.freshness.status]);

/**
 * Resolves the public Inspector surface for the product focus controller.
 * @param value - Mounted Vue component or its native root.
 */
function captureSurface(value: Element | ComponentPublicInstance | null): void {
  const element = value !== null && "$el" in value ? value.$el : value;
  panelSurface.value = element instanceof HTMLElement ? element : undefined;
}

/** Exposes only the typed controller to parent-owned mount fixtures and later shell adapters. */
defineExpose({ controller });

/** Reconciles direct contribution identities without an executable id lookup. */
function synchronizeContributions(): void {
  const next = new Set(props.contributions);
  for (const [contribution, unregister] of registrationCleanups) {
    if (next.has(contribution)) continue;
    unregister();
    registrationCleanups.delete(contribution);
  }
  for (const contribution of props.contributions) {
    if (registrationCleanups.has(contribution)) continue;
    registrationCleanups.set(contribution, controller.register(contribution));
  }
}

/** Releases feature-owned mounted content before replacement or host teardown. */
function destroyMountedContribution(): void {
  mountedContribution?.destroy();
  mountedContribution = undefined;
  mountedEntryId = null;
  panelBody.value?.replaceChildren();
}

/**
 * Mounts or refreshes the active feature content from immutable shared facts.
 *
 * Host and task controllers are deliberately projected to snapshots here; the
 * contribution receives no external-effect execution authority.
 */
function synchronizeMountedContribution(): void {
  const entry = active.value;
  const body = panelBody.value;
  if (entry === null || body === undefined) {
    destroyMountedContribution();
    return;
  }
  const mountContext = {
    product: projectClassicEditorWorkspacePanelProduct(props.context),
    entry,
    host: projectClassicEditorWorkspacePanelHost(props.context),
    navigation: controller
  } as const;
  if (mountedEntryId === entry.entryId && mountedContribution !== undefined) {
    mountedContribution.updatePanel?.(mountContext);
    return;
  }
  destroyMountedContribution();
  mountedContribution = entry.contribution.mount(mountContext);
  mountedEntryId = entry.entryId;
  if (typeof mountedContribution.element === "string") {
    body.append(mountedContribution.element);
  } else if (mountedContribution.element !== null) {
    body.append(mountedContribution.element);
  }
}

/** Rebinds read-only Host subscriptions when the owning instance changes. */
function synchronizeHostProjection(): void {
  unsubscribeTasks?.();
  unsubscribeResources?.();
  unsubscribeTasks = props.context.instance.tasks.subscribe(() => {
    synchronizeMountedContribution();
  });
  unsubscribeResources = props.context.instance.hostResources.subscribe(() => {
    synchronizeMountedContribution();
  });
}

/**
 * Handles root-local panel keyboard navigation.
 *
 * @param event - Native key event captured by this instance's panel only.
 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.isComposing || event.defaultPrevented) return;
  if (event.key === "Escape") {
    if (!controller.close("escape")) return;
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  if (event.altKey && event.key === "ArrowLeft" && controller.back()) {
    event.preventDefault();
    event.stopPropagation();
  }
}

watch(() => props.contributions, synchronizeContributions, {
  immediate: true,
  deep: false
});
watch(() => props.context.instance, synchronizeHostProjection, { immediate: true });
watch(panelSurface, (surface) => controller.bindFocusSurface(surface ?? null), {
  immediate: true,
  flush: "post"
});
watch(
  [() => snapshot.value.revision, panelBody, () => props.context],
  synchronizeMountedContribution,
  { immediate: true, flush: "post" }
);
watch(
  () => active.value?.entryId ?? null,
  (entryId, previousEntryId) => {
    if (entryId === null || entryId === previousEntryId) return;
    void nextTick(() => {
      if (!disposed) controller.focus();
    });
  },
  { flush: "post" }
);

/** Releases root-local subscriptions, registrations, content, and focus deterministically. */
onBeforeUnmount(() => {
  disposed = true;
  unsubscribeTasks?.();
  unsubscribeResources?.();
  unsubscribePanel();
  unsubscribePanel = () => undefined;
  destroyMountedContribution();
  controller.destroy("unmount");
  registrationCleanups.clear();
});
</script>

<template>
  <QuireInspector
    v-if="active"
    :ref="captureSurface"
    :id="active.entryId"
    :title="title"
    :description="targetLabel"
    width="clamp(320px, 25vw, 400px)"
    size="sm"
    class="qk-workspace-panel"
    :data-panel-kind="active.contribution.kind"
    :data-target-status="active.freshness.status"
    :aria-disabled="active.freshness.status === 'ready' ? undefined : 'true'"
    :aria-label="message.workspace"
    role="complementary"
    tabindex="-1"
    @keydown.capture="handleKeydown"
  >
    <template #actions>
      <QuireTooltipRoot v-if="snapshot.canBack" :open-delay="420" placement="bottom">
        <QuireTooltipTrigger as-child>
          <QuireIconButton
            :label="message.back"
            :title="message.back"
            size="sm"
            data-workspace-panel-action="back"
            @click="controller.back()"
          ><QuireIcon name="arrowLeft" :size="16" /></QuireIconButton>
        </QuireTooltipTrigger>
        <QuireTooltipContent :content="message.back" />
      </QuireTooltipRoot>
      <QuireTooltipRoot :open-delay="420" placement="bottom">
        <QuireTooltipTrigger as-child>
          <QuireIconButton
            :label="active.pinned ? message.unpin : message.pin"
            :title="active.pinned ? message.unpin : message.pin"
            :aria-pressed="active.pinned"
            size="sm"
            data-workspace-panel-action="pin"
            @click="controller.setPinned(!active.pinned)"
          ><QuireIcon :name="active.pinned ? 'pinOff' : 'pin'" :size="16" /></QuireIconButton>
        </QuireTooltipTrigger>
        <QuireTooltipContent :content="active.pinned ? message.unpin : message.pin" />
      </QuireTooltipRoot>
      <QuireTooltipRoot :open-delay="420" placement="bottom">
        <QuireTooltipTrigger as-child>
          <QuireIconButton
            :label="message.close"
            :title="message.close"
            size="sm"
            data-workspace-panel-action="close"
            @click="controller.close('explicit')"
          ><QuireIcon name="close" :size="16" /></QuireIconButton>
        </QuireTooltipTrigger>
        <QuireTooltipContent :content="message.close" />
      </QuireTooltipRoot>
    </template>
    <template v-if="active.freshness.status !== 'ready'" #status>
      {{ freshnessLabel }}<span v-if="active.freshness.reason"> · {{ active.freshness.reason }}</span>
    </template>
    <div ref="panelBody" class="qk-workspace-panel__body" />
  </QuireInspector>
</template>
