<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, nextTick, ref, shallowRef, watch } from "vue";
import type { Editor } from "@quirekit/core";
import { EditorUIAnchoredOverlay, type EditorUIAnchoredOverlayAnchor } from "@quirekit/editor-ui/vue";
import { QuireCalendar, QuirePopoverAnchor, QuirePopoverContent, QuirePopoverRoot } from "@quirekit/ui/vue";
import type { InlineContentRequest } from "../../inline-content/types";
import { validInlineDate } from "../../inline-content/value";

const { t } = useBlockLocale();

const props = defineProps<{
  /** Canonical document owner. */ editor: Editor;
  /** Captured atom and immutable source. */ request: InlineContentRequest;
  /** Validation feedback; failed writes keep the panel open. */ error: string;
}>();
const emit = defineEmits<{ select: [value: string]; close: [focus: boolean] }>();
const surface = ref<HTMLElement>();
const anchor = shallowRef<EditorUIAnchoredOverlayAnchor | null>(null);
const anchorStyle = computed(() => ({
  display: "block", pointerEvents: "none" as const,
  width: `${anchor.value?.rects?.[0]?.width ?? 0}px`, height: `${anchor.value?.rects?.[0]?.height ?? 0}px`
}));
/** @returns Exact atom bounds on opening and resize; scrolling uses retained document geometry. */
function measure(): EditorUIAnchoredOverlayAnchor | null {
  if (!props.editor.mountedView || props.request.position === undefined || props.editor.state.doc !== props.request.doc) return null;
  const node = props.editor.view.nodeDOM?.(props.request.position);
  if (!(node instanceof Element)) return null;
  const rect = node.getBoundingClientRect();
  return { x: rect.left, y: rect.top, rects: [{ x: rect.left, y: rect.top, width: rect.width, height: rect.height }] };
}
/** @param value - Public Calendar selection; only complete single dates can commit. */
function choose(value: string | readonly string[] | null): void { if (typeof value === "string") emit("select", value); }
/** @param event - Explicit cancellation returns to the date; outside dismissal keeps its new focus owner. */
function escape(event: KeyboardEvent): void {
  if (event.isComposing || event.defaultPrevented) return;
  event.preventDefault(); event.stopPropagation(); emit("close", true);
}
watch(() => props.request, (source, _previous, cleanup) => {
  const editor = props.editor, document = editor.view.dom.ownerDocument, window = document.defaultView;
  let current = true;
  let frame = 0;
  let geometryFrame = 0;
  anchor.value = measure();
  /** Reprojects the single resident atom after reflow; scroll stays in document coordinates. */
  function resized(): void {
    if (!window || geometryFrame) return;
    geometryFrame = window.requestAnimationFrame(() => { geometryFrame = 0; anchor.value = measure(); });
  }
  const observer = window?.ResizeObserver ? new window.ResizeObserver(resized) : null;
  observer?.observe(editor.view.dom);
  window?.addEventListener("resize", resized);
  /** Revokes an obsolete target without scanning or serializing the document. */
  function changed(): void { if (!editor.isEditable || editor.state.doc !== source.doc) emit("close", false); }
  /** Mount loss ends the geometry lease. */
  function unmount(): void { emit("close", false); }
  editor.on("transaction", changed); editor.on("unmount", unmount);
  // Let the triggering editor command finish restoring input before the calendar takes focus.
  void nextTick(() => {
    if (!current || !window) return;
    frame = window.requestAnimationFrame(() => {
      surface.value?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')?.focus({ preventScroll: true });
    });
  });
  cleanup(() => {
    current = false; window?.cancelAnimationFrame(frame); window?.cancelAnimationFrame(geometryFrame);
    observer?.disconnect(); window?.removeEventListener("resize", resized);
    editor.off("transaction", changed); editor.off("unmount", unmount);
  });
}, { immediate: true });
</script>
<template>
  <!-- View projects the resident date anchor; the public Popover owns the floating surface and dismissal. -->
  <EditorUIAnchoredOverlay v-slot="{ portalTarget }" show :anchor="anchor" :resolve-anchor="measure" placement="exact" unconstrained>
    <QuirePopoverRoot open :auto-focus="false" :restore-focus="false" placement="bottom-start" @escape-key-down="escape" @update:open="!$event && emit('close', false)">
      <QuirePopoverAnchor><span aria-hidden="true" :style="anchorStyle" /></QuirePopoverAnchor>
      <QuirePopoverContent :portal-target="portalTarget" :show-arrow="false" padding="none" border="subtle" :aria-label="t('修改日期')" class="qk-date-picker__panel qk-date-picker__panel--comfortable">
        <div ref="surface">
          <QuireCalendar :label="t('日期')" :model-value="validInlineDate(request.value) ? request.value : null" min="0001-01-01" max="9999-12-31" @update:model-value="choose">
            <template v-if="error" #footer><p role="alert">{{ t(error) }}</p></template>
          </QuireCalendar>
        </div>
      </QuirePopoverContent>
    </QuirePopoverRoot>
  </EditorUIAnchoredOverlay>
</template>
