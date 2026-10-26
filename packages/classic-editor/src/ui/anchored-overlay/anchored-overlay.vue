<script setup lang="ts">
import {
  computed,
  ref,
  watch
} from "vue";
import { useClassicEditorOverlay } from "../../shell/overlays/registry";
import {
  projectClassicEditorAnchoredOverlayAnchor,
  resolveClassicEditorDocumentOverlayHost
} from "./host";
import { useOverlayBoundaryPosition } from "./use-position";
import type {
  ClassicEditorAnchoredOverlayAnchor,
  ClassicEditorAnchoredOverlayProps,
  ClassicEditorAnchoredOverlayScope,
  ClassicEditorAnchoredOverlaySlots
} from "./types";

/** Runtime props retain the live geometry resolver during Vue SFC compilation. */
interface AnchoredOverlayComponentProps
  extends ClassicEditorAnchoredOverlayProps {
  /** Resolves current geometry when the semantic target may have changed. */
  readonly resolveAnchor?:
    (() => ClassicEditorAnchoredOverlayAnchor | null) | undefined;
}

const props = withDefaults(defineProps<AnchoredOverlayComponentProps>(), {
  overlayFamily: "anchored-overlay",
  placement: "bottom-start",
  persistent: false,
  resolveAnchor: undefined
});
defineSlots<ClassicEditorAnchoredOverlaySlots>();
const emit = defineEmits<{
  /** Updates the consumer-owned controlled visibility. */
  "update:show": [show: boolean];
}>();
let synchronizingOverlay = false;
const controlledVisibility = computed({
  get: () => props.show,
  set: (show: boolean) => {
    if (!synchronizingOverlay && show !== props.show) {
      emit("update:show", show);
    }
  }
});
let registeredVisible = false;
let registeredRoot = props.editorRoot;
let openingElement: HTMLElement | null = null;
const retainedAnchor = ref<ClassicEditorAnchoredOverlayAnchor>({ x: 0, y: 0 });
const overlayHost = ref<HTMLElement | null>(null);
const anchorAvailable = ref(false);
const overlay = useClassicEditorOverlay(
  props.overlayFamily,
  controlledVisibility,
  props.editorRoot.ownerDocument,
  { resolveRoot: () => props.editorRoot },
  {
    dismissOnEscape: () => {
      queueMicrotask(restoreOpeningFocus);
      return true;
    }
  }
);
const visible = computed(() => (
  overlay.isVisible() && anchorAvailable.value && overlayHost.value !== null
));
const surfaceStyle = useOverlayBoundaryPosition({
  root: () => props.editorRoot,
  host: () => overlayHost.value,
  anchor: () => retainedAnchor.value,
  placement: () => props.placement,
  visible: () => visible.value,
  ownerId: overlay.id,
  refreshAnchor: () => props.resolveAnchor === undefined ? undefined : refreshAnchor()
});
const scope = computed<ClassicEditorAnchoredOverlayScope | null>(() => {
  const host = overlayHost.value;
  if (host === null) return null;
  return {
    ownerAttributes: overlay.ownerAttributes,
    style: surfaceStyle.value,
    portalTarget: host,
    close: overlay.close
  };
});

/** @returns The current product-owned document overlay host. */
function resolveOverlayHost(): HTMLElement | null {
  return resolveClassicEditorDocumentOverlayHost(props.editorRoot);
}

/**
 * Projects the latest semantic point into document-overlay coordinates.
 *
 * @returns Whether both the target and document overlay remain available.
 */
function refreshAnchor(): boolean {
  const host = resolveOverlayHost();
  const viewportAnchor = props.resolveAnchor === undefined
    ? props.anchor
    : props.resolveAnchor();
  if (host === null || viewportAnchor === null) {
    anchorAvailable.value = false;
    return false;
  }
  overlayHost.value = host;
  retainedAnchor.value = projectClassicEditorAnchoredOverlayAnchor(
    viewportAnchor,
    host
  );
  anchorAvailable.value = true;
  return true;
}

/** Synchronizes controlled visibility with root-scoped overlay ownership. */
function refreshSurface(): void {
  const nextVisible = props.show && refreshAnchor();
  // A selection-owned Toolbar stays mounted while its child menu owns the
  // transient coordinator slot. Geometry and document-space mounting are shared.
  if (props.persistent) {
    if (registeredVisible) {
      synchronizingOverlay = true;
      try { overlay.setVisible(false); } finally { synchronizingOverlay = false; }
      registeredVisible = false;
    }
    return;
  }
  if (nextVisible === registeredVisible && props.editorRoot === registeredRoot) return;
  if (nextVisible && (!registeredVisible || props.editorRoot !== registeredRoot)) {
    const element = props.editorRoot.ownerDocument.activeElement;
    const HTMLElementConstructor = props.editorRoot.ownerDocument.defaultView?.HTMLElement;
    openingElement = HTMLElementConstructor && element instanceof HTMLElementConstructor
      ? element
      : null;
  }
  registeredVisible = nextVisible;
  registeredRoot = props.editorRoot;
  synchronizingOverlay = true;
  try {
    overlay.setVisible(nextVisible);
  } finally {
    synchronizingOverlay = false;
  }
}

/** Returns keyboard focus to the connected element that preceded the overlay. */
function restoreOpeningFocus(): void {
  if (openingElement?.isConnected) openingElement.focus();
}

watch(
  [
    () => props.show,
    () => props.editorRoot,
    () => props.anchor,
    () => props.resolveAnchor,
    () => props.persistent
  ],
  refreshSurface,
  { flush: "sync", immediate: true }
);
</script>

<template>
  <Teleport v-if="visible && overlayHost !== null && scope !== null" :to="overlayHost">
    <slot v-bind="scope" />
  </Teleport>
</template>
