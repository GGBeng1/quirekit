<script setup lang="ts">
import {
  computed,
  provide,
  ref,
  watch
} from "vue";
import { useClassicEditorOverlay } from "../../shell/overlays/registry";
import {
  projectClassicEditorPopupMenuAnchor,
  resolveClassicEditorPopupMenuOverlayHost,
  retainClassicEditorPopupMenuAnchor
} from "./anchor";
import {
  classicEditorPopupMenuChildOverlay,
  classicEditorPopupMenuTeleportTarget
} from "./context";
import {
  QuireCard,
  QuireToolbar,
  provideQuireInheritedThemePortals
} from "@quirekit/ui/vue";
import { useOverlayBoundaryPosition } from "../anchored-overlay/use-position";
import { usePopupDismissal } from "./use-dismissal";
import type {
  ClassicEditorPopupMenuAnchor,
  ClassicEditorPopupMenuProps,
  ClassicEditorPopupMenuSlots
} from "./types";

/** Vue runtime props that preserve the public live-anchor callback at runtime. */
interface ClassicEditorPopupMenuComponentProps
  extends ClassicEditorPopupMenuProps {
  /** Resolves fresh viewport geometry after scroll or viewport resize. */
  readonly resolveAnchor?:
    (() => ClassicEditorPopupMenuAnchor | null) | undefined;
}

const props = withDefaults(
  defineProps<ClassicEditorPopupMenuComponentProps>(),
  {
    overlayFamily: "popup-menu",
    placement: "bottom-start",
    resolveAnchor: undefined,
    surfaceClass: undefined,
    maxColumns: undefined
  }
);
const slots = defineSlots<ClassicEditorPopupMenuSlots>();
provideQuireInheritedThemePortals();
const emit = defineEmits<{
  /** Updates the consumer-owned controlled visibility. */
  "update:show": [show: boolean];
}>();
const activeChildOverlay = ref<symbol | null>(null);
let synchronizingOverlay = false;
let registeredVisible = false;
let registeredRoot = props.themeRoot;
let openingElement: HTMLElement | null = null;
const controlledVisibility = computed({
  get: () => props.show,
  set: (show: boolean) => {
    if (!show) activeChildOverlay.value = null;
    if (!synchronizingOverlay && show !== props.show) {
      emit("update:show", show);
    }
  }
});

const overlay = useClassicEditorOverlay(
  props.overlayFamily,
  controlledVisibility,
  props.themeRoot.ownerDocument,
  { resolveRoot: () => props.themeRoot },
  { dismissOnEscape: () => false, dismissOnOutsidePointer: () => false }
);
const retainedAnchor = ref<ClassicEditorPopupMenuAnchor>({ x: 0, y: 0 });
const retainedOverlayHost = ref<HTMLElement | null>(null);
const anchorAvailable = ref(false);
const teleportTarget = computed(() => (
  retainedOverlayHost.value ?? props.themeRoot.ownerDocument.body
));
const menuVisible = computed(() => (
  overlay.isVisible() && anchorAvailable.value
));

/**
 * Reads current slot availability without caching a mutable Vue slots object.
 *
 * Dynamic consumers can add the direct-editor body while the same contextual
 * surface remains mounted, so slot presence must be observed on every render.
 *
 * @param name - Public Popup Menu slot to inspect.
 * @returns Whether the current parent render contributes that slot.
 */
function hasSlot(name: keyof ClassicEditorPopupMenuSlots): boolean {
  return slots[name] !== undefined;
}

/**
 * Resolves whether the compact header contains labels or actions.
 *
 * @returns Whether the current Popup Menu needs its header row.
 */
function hasHeaderContent(): boolean {
  return hasSlot("leading") || hasSlot("default");
}

/**
 * Resolves whether the surface contains only toolbar actions.
 *
 * @returns Whether no heading or business body is present.
 */
function usesActionOnlyToolbar(): boolean {
  return !hasSlot("leading") && !hasSlot("body");
}

const surfaceStyle = useOverlayBoundaryPosition({
  root: () => props.themeRoot,
  host: () => retainedOverlayHost.value,
  anchor: () => retainedAnchor.value,
  placement: () => props.placement,
  visible: () => menuVisible.value,
  ownerId: overlay.id,
  refreshAnchor: () => props.resolveAnchor === undefined ? undefined : refreshAnchor()
});
usePopupDismissal({
  root: () => props.themeRoot,
  visible: () => menuVisible.value,
  ownerId: overlay.id,
  hasChild: () => activeChildOverlay.value !== null,
  hasTarget: () => props.resolveAnchor?.() != null,
  close: overlay.close,
  restoreFocus: () => { if (openingElement?.isConnected) openingElement.focus({ preventScroll: true }); }
});

provide(classicEditorPopupMenuTeleportTarget, teleportTarget);
provide(classicEditorPopupMenuChildOverlay, {
  ownerAttributes: overlay.ownerAttributes,
  isOpen: (id: symbol) => activeChildOverlay.value === id,
  setOpen: (id: symbol, open: boolean) => {
    activeChildOverlay.value = open ? id : (
      activeChildOverlay.value === id ? null : activeChildOverlay.value
    );
  },
  closeChild: () => {
    activeChildOverlay.value = null;
  },
  closeSurface: overlay.close
});

/**
 * Resolves current View geometry without coupling the shared surface to an
 * editor capability or coordinate system.
 *
 * @returns Whether the semantic target still exposes a viewport anchor.
 */
function refreshAnchor(): boolean {
  const overlayHost = resolveClassicEditorPopupMenuOverlayHost(props.themeRoot);
  const viewportAnchor = props.resolveAnchor === undefined
    ? props.anchor
    : props.resolveAnchor();
  const anchor = viewportAnchor === null || overlayHost === null
    ? null
    : projectClassicEditorPopupMenuAnchor(viewportAnchor, overlayHost);
  if (overlayHost !== null) retainedOverlayHost.value = overlayHost;
  anchorAvailable.value = anchor !== null;
  retainedAnchor.value = retainClassicEditorPopupMenuAnchor(
    retainedAnchor.value,
    anchor
  );
  return anchor !== null;
}

/**
 * Synchronizes controlled visibility without reporting the internal geometry
 * normalization as a user-requested close.
 *
 * @param visible - Visibility after the current anchor check.
 */
function synchronizeOverlayVisibility(visible: boolean): void {
  // Geometry refreshes must not reclaim ownership from a newly opened sibling.
  // The controlled close may still be waiting for its parent render to settle.
  if (visible === registeredVisible && props.themeRoot === registeredRoot) return;
  if (visible && (!registeredVisible || props.themeRoot !== registeredRoot)) {
    const element = props.themeRoot.ownerDocument.activeElement;
    const HTMLElementConstructor = props.themeRoot.ownerDocument.defaultView?.HTMLElement;
    openingElement = HTMLElementConstructor && element instanceof HTMLElementConstructor ? element : null;
  }
  if (!visible) activeChildOverlay.value = null;
  registeredVisible = visible;
  registeredRoot = props.themeRoot;
  synchronizingOverlay = true;
  try {
    overlay.setVisible(visible);
  } finally {
    synchronizingOverlay = false;
  }
}

/** Refreshes the product target and releases ownership when its geometry disappears. */
function refreshSurface(): void {
  synchronizeOverlayVisibility(props.show && refreshAnchor());
}

watch(
  [
    () => props.show,
    () => props.themeRoot,
    () => props.anchor,
    () => props.resolveAnchor
  ],
  ([show]) => {
    if (!show) {
      activeChildOverlay.value = null;
    }
    refreshSurface();
  },
  {
    flush: "sync",
    immediate: true
  }
);

</script>

<template>
  <!-- Create the parent and its child portals in the same document owner from
       their first mount; a hidden body portal must never be retargeted on open. -->
  <Teleport v-if="retainedOverlayHost !== null" :to="retainedOverlayHost">
    <QuireToolbar
      v-if="menuVisible && usesActionOnlyToolbar()"
      :style="surfaceStyle"
      :data-state="menuVisible ? 'open' : 'closed'"
      v-bind="overlay.ownerAttributes"
      class="qk-classic-editor__popup-menu"
      :class="surfaceClass"
      :label="label"
      variant="outlined"
      overflow="visible"
      align="start"
      preserve-focus
      @pointerdown.stop
    >
      <slot />
    </QuireToolbar>
    <QuireCard
      v-else-if="menuVisible"
      variant="raised"
      density="compact"
      :style="surfaceStyle"
      :data-state="menuVisible ? 'open' : 'closed'"
      v-bind="overlay.ownerAttributes"
      class="qk-classic-editor__popup-menu qk-classic-editor__popup-menu-card"
      :class="[surfaceClass, { 'has-body': hasSlot('body') }]"
      role="dialog"
      :aria-label="label"
      @pointerdown.stop
    >
      <div
        v-if="hasHeaderContent()"
        class="qk-classic-editor__popup-menu-header"
      >
        <div
          v-if="hasSlot('leading')"
          class="qk-classic-editor__popup-menu-leading"
        >
          <slot name="leading" />
        </div>
        <span
          v-if="hasSlot('leading') && hasSlot('default')"
          class="qk-classic-editor__popup-menu-divider"
          aria-hidden="true"
        />
        <QuireToolbar
          v-if="hasSlot('default')"
          class="qk-classic-editor__popup-menu-actions"
          :label="label"
          variant="plain"
          overflow="visible"
          align="start"
          preserve-focus
        >
          <slot />
        </QuireToolbar>
      </div>
      <div
        v-if="hasSlot('body')"
        class="qk-classic-editor__popup-menu-body"
      >
        <slot name="body" />
      </div>
    </QuireCard>
  </Teleport>
</template>
