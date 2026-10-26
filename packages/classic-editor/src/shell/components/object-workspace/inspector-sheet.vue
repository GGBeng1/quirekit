<script setup lang="ts">
import { QuireButton, QuireTooltipRoot, QuireTooltipTrigger, QuireTooltipContent } from "@quirekit/ui/vue";
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { resolveClassicEditorText } from "@classic/localization";

import type {
  ClassicEditorObjectWorkspaceController,
  ClassicEditorObjectWorkspaceSnapshot
} from "@classic/types/object-workspace";
import { useClassicEditorOverlay } from "../../overlays/registry";
import { resolveClassicEditorOverlayState } from "../../overlays/document-state";
import ClassicEditorObjectInspectorSurface from "./inspector-surface.vue";
import { resolveObjectWorkspaceMessages } from "./localization";
import { createObjectWorkspaceDomId } from "./dom-identity";

/** Full-height responsive Inspector Sheet inputs. */
interface ClassicEditorObjectInspectorSheetProps {
  /** Shared exact-target controller. */
  readonly controller: ClassicEditorObjectWorkspaceController;
}

const props = defineProps<ClassicEditorObjectInspectorSheetProps>();
const occurrence = createObjectWorkspaceDomId("sheet");
const snapshot = shallowRef<ClassicEditorObjectWorkspaceSnapshot>(props.controller.snapshot);
const surface = ref<HTMLElement>();
const composing = ref(false);
const messages = computed(() => resolveObjectWorkspaceMessages(props.controller.context.locale));
const definition = computed(() => snapshot.value.contribution?.inspector ?? null);
const visible = computed({
  get: () => snapshot.value.sheetOpen,
  set: (value: boolean) => {
    if (!value) props.controller.closeSheet("explicit");
  }
});
const overlay = useClassicEditorOverlay(
  "object-inspector-sheet",
  visible,
  props.controller.context.ownerDocument,
  props.controller.context.root,
  {
    dismissOnEscape: () => false,
    dismissOnOutsidePointer: () => false
  }
);
const unsubscribe = props.controller.subscribe((next) => {
  snapshot.value = next;
});

watch(() => snapshot.value.sheetOpen, (next) => {
  overlay.setVisible(next);
  if (!next) return;
  void nextTick(() => firstFocusable(surface.value)?.focus({ preventScroll: true }));
}, { flush: "post" });

/** Closes the Sheet through its typed back path. */
function back(): void {
  props.controller.closeSheet("back");
}

/** Closes the Sheet through its explicit close path. */
function close(): void {
  props.controller.closeSheet("explicit");
}

/**
 * Traps Tab inside the modal Sheet and gives Escape one deterministic owner.
 *
 * @param event - Sheet key event.
 */
function handleKeydown(event: KeyboardEvent): void {
  if (composing.value || event.isComposing) return;
  if (event.key === "Escape") {
    // A nested public overlay owns an already handled Escape. Synthetic Sheet
    // events still exercise the Sheet's own close path directly.
    if (event.defaultPrevented && event.target !== event.currentTarget) return;
    props.controller.closeSheet("escape");
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = focusableElements(surface.value);
  if (focusable.length === 0) return;
  const current = focusable.indexOf(event.target as HTMLElement);
  const next = event.shiftKey
    ? (current - 1 + focusable.length) % focusable.length
    : (current + 1) % focusable.length;
  focusable[next]?.focus();
  event.preventDefault();
}

/** Marks the modal form as owned by an active IME composition. */
function startComposition(): void {
  composing.value = true;
  resolveClassicEditorOverlayState(props.controller.context.ownerDocument)
    .coordinator.release(overlay.id);
}

/** Releases IME suppression after the browser commits composition text. */
function endComposition(): void {
  composing.value = false;
  if (snapshot.value.sheetOpen) overlay.setVisible(true);
}

/** @param element - Sheet surface. @returns First enabled focus target. */
function firstFocusable(element: HTMLElement | undefined): HTMLElement | undefined {
  return focusableElements(element)[0];
}

/** @param element - Sheet surface. @returns Enabled focus targets in DOM order. */
function focusableElements(element: HTMLElement | undefined): HTMLElement[] {
  return [...(element?.querySelectorAll<HTMLElement>(
    "button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex='0']"
  ) ?? [])];
}

onBeforeUnmount(unsubscribe);
</script>

<template>
  <section
    v-if="snapshot.sheetOpen && definition && snapshot.contribution && snapshot.target"
    v-bind="overlay.ownerAttributes"
    ref="surface"
    class="qk-object-inspector-sheet"
    data-object-inspector-layout="sheet"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="`qk-object-sheet-${occurrence}-title`"
    @compositionstart.capture="startComposition"
    @compositionend.capture="endComposition"
    @keydown="handleKeydown"
  >
    <header class="qk-object-inspector-sheet__header">
      <QuireTooltipRoot
        :open-delay="420"
        placement="bottom"
      >
<QuireTooltipTrigger as-child>
          <QuireButton
            type="button" variant="ghost"
            circle
            data-object-sheet-back
            :aria-label="messages.back"
            @click="back"
          >
            <span aria-hidden="true">←</span>
          </QuireButton>
        </QuireTooltipTrigger>
<QuireTooltipContent :portal-target="controller.context.ownerDocument.body" :show-arrow="false">
        {{ messages.back }}
      </QuireTooltipContent>
</QuireTooltipRoot>
      <div>
        <h2 :id="`qk-object-sheet-${occurrence}-title`">
          {{ resolveClassicEditorText(definition.title, controller.context.locale) }}
        </h2>
        <p>{{ resolveClassicEditorText(snapshot.target.label, controller.context.locale) }}</p>
      </div>
      <QuireTooltipRoot
        :open-delay="420"
        placement="bottom"
      >
<QuireTooltipTrigger as-child>
          <QuireButton
            type="button" variant="ghost"
            circle
            data-object-sheet-close
            :aria-label="messages.close"
            @click="close"
          >
            <span aria-hidden="true">×</span>
          </QuireButton>
        </QuireTooltipTrigger>
<QuireTooltipContent :portal-target="controller.context.ownerDocument.body" :show-arrow="false">
        {{ messages.close }}
      </QuireTooltipContent>
</QuireTooltipRoot>
    </header>
    <div class="qk-object-inspector-sheet__body">
      <ClassicEditorObjectInspectorSurface :controller="controller" />
    </div>
  </section>
</template>
