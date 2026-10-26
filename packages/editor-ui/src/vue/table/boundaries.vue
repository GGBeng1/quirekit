<script setup lang="ts">
import type {
  QuireMountedTableChromeAnchor,
  QuireMountedTableChromeFragment,
  QuireMountedTableChromeModel
} from "@quirekit/core";
import {
  computed,
  onBeforeUnmount,
  ref, watch
} from "vue";
import type { EditorUILocale } from "./types";
import { QuireTooltipRoot, QuireTooltipTrigger, QuireTooltipContent } from "@quirekit/ui/vue";
import {
  createEditorUITableInsertionGuideStyle,
  createEditorUITableInsertionStyle,
  createEditorUITableResizeGuideStyle,
  createEditorUITableResizeHandleStyle,
  createEditorUITableResizeHoverGuideStyle
} from "./boundary-geometry";
import { createEditorUITableResizeController } from "./resize-session";
import type {
  EditorUITableInsertionRequest,
  EditorUITableResizeRequest
} from "./types";

/** Inputs rendered by the Table insertion and resize boundary layer. */
interface EditorUITableBoundariesProps {
  /** Active page-local Table fragment in workspace scrolling coordinates. */
  readonly fragment: QuireMountedTableChromeFragment;
  /** Unscaled source sizes retained by the mounted table geometry. */
  readonly sizing: QuireMountedTableChromeModel["sizing"];
  /** Exact physical segment under the idle document pointer, if any. */
  readonly pointerResizeId: string | null;
  /** Product locale used by accessible copy and tooltips. */
  readonly locale: EditorUILocale;
  /** Physical owner inherited from the table chrome. */
  readonly teleportTarget: HTMLElement;
  /** Browser document that owns teleported tooltips. */
  readonly ownerDocument: Document;
  /** Classic instance supplying the public Tooltip theme. */
  readonly themeRoot: HTMLElement;
  /** Target/layout generation; changes cancel captured gestures. */
  readonly identity: unknown;
  /** Axis whose current neighborhood is materialized. */
  readonly activeAxis: "row" | "column";
  /** Nearest canonical insertion boundary retained by the active rail. */
  readonly activeBoundaryIndex: number;
  /** Current source row retained for segmented-boundary resolution. */
  readonly activeRowIndex: number;
  /** Current grid column retained for segmented-boundary resolution. */
  readonly activeColumnIndex: number;
}

const props = defineProps<EditorUITableBoundariesProps>();
const emit = defineEmits<{
  /** Requests an atomic insertion at one row or column boundary. */
  insert: [request: EditorUITableInsertionRequest];
  /** Commits one pointer-previewed row height or column width. */
  resize: [request: EditorUITableResizeRequest];
}>();
const resizeController = createEditorUITableResizeController();
const previewedInsertionId = ref<string | null>(null);
const hoveredResizeId = ref<string | null>(null);
const activeIndex = computed(() => props.activeAxis === "row"
  ? props.activeRowIndex
  : props.activeColumnIndex
);
const activeInsertion = computed(() => (
  props.fragment.insertions.find(anchor => (
    anchor.kind === `insert-${props.activeAxis}`
    && anchor.boundaryIndex === props.activeBoundaryIndex
  )) ?? null
));
const railResize = computed(() => {
  const crossAnchor = props.activeAxis === "row"
    ? props.fragment.columns.find(
        anchor => anchor.columnIndex === props.activeColumnIndex
      )
    : props.fragment.rows.find(
        anchor => anchor.rowIndex === props.activeRowIndex
      );
  const crossCoordinate = crossAnchor === undefined
    ? null
    : props.activeAxis === "row"
      ? (crossAnchor.rect.left + crossAnchor.rect.right) / 2
      : (crossAnchor.rect.top + crossAnchor.rect.bottom) / 2;
  const candidates = props.fragment.resizes.filter(anchor => (
    anchor.kind === `resize-${props.activeAxis}`
    && (props.activeAxis === "row"
      ? anchor.rowIndex === activeIndex.value
      : anchor.columnIndex === activeIndex.value)
  ));
  return candidates.find(anchor => crossCoordinate !== null && (
    props.activeAxis === "row"
      ? crossCoordinate >= anchor.rect.left
        && crossCoordinate <= anchor.rect.right
      : crossCoordinate >= anchor.rect.top
        && crossCoordinate <= anchor.rect.bottom
  )) ?? candidates[0] ?? null;
});
const resizeAnchors = computed(() => new Map(props.fragment.resizes.map(anchor => [anchor.id, anchor])));
const activeResize = computed(() => (
  (props.pointerResizeId === null ? null : resizeAnchors.value.get(props.pointerResizeId))
  ?? railResize.value
));
const previewedInsertion = computed(() => (
  activeInsertion.value?.id === previewedInsertionId.value
    ? activeInsertion.value
    : null
));
const hoveredResize = computed(() => (
  activeResize.value?.id === (props.pointerResizeId ?? hoveredResizeId.value)
    ? activeResize.value
    : null
));

/**
 * Dispatches one insertion boundary after validating its model payload.
 *
 * @param axis - Row or column axis.
 * @param anchor - Mounted insertion boundary.
 */
function insertAt(
  axis: EditorUITableInsertionRequest["axis"],
  anchor: QuireMountedTableChromeAnchor
): void {
  previewedInsertionId.value = null;
  if (anchor.boundaryIndex !== undefined) {
    emit("insert", { axis, boundaryIndex: anchor.boundaryIndex });
  }
}

/**
 * Reveals the passive full-axis preview for one explicit insertion button.
 *
 * @param anchor - Mounted insertion boundary owning the preview.
 */
function showInsertionPreview(anchor: QuireMountedTableChromeAnchor): void {
  previewedInsertionId.value = anchor.id;
}

/**
 * Clears a preview only when the departing control still owns it.
 *
 * @param anchor - Mounted insertion boundary releasing preview ownership.
 */
function hideInsertionPreview(anchor: QuireMountedTableChromeAnchor): void {
  if (previewedInsertionId.value === anchor.id) {
    previewedInsertionId.value = null;
  }
}

/**
 * Resolves indexed insertion copy for the one materialized gap.
 *
 * @param anchor - Canonical boundary anchor projected by the mounted View.
 * @returns Localized label containing the exact before/after result.
 */
function insertionLabel(anchor: QuireMountedTableChromeAnchor): string {
  const boundary = anchor.boundaryIndex ?? 0;
  const noun = props.activeAxis === "row" ? "row" : "column";
  if (props.locale === "zh-CN") {
    return boundary === 0
      ? `在第 1 ${noun === "row" ? "行" : "列"}前插入一${noun === "row" ? "行" : "列"}`
      : `在第 ${boundary} ${noun === "row" ? "行" : "列"}后插入一${noun === "row" ? "行" : "列"}`;
  }
  return boundary === 0
    ? `Insert ${noun} before ${noun} 1`
    : `Insert ${noun} after ${noun} ${boundary}`;
}

/**
 * Resolves indexed resize copy for the one materialized boundary segment.
 *
 * @param anchor - Canonical resize segment projected by the mounted View.
 * @returns Localized label containing the exact source axis index.
 */
function resizeLabel(anchor: QuireMountedTableChromeAnchor): string {
  const axis = anchor.kind === "resize-row" ? "row" : "column";
  const index = (axis === "row"
    ? anchor.rowIndex
    : anchor.columnIndex) ?? 0;
  if (props.locale === "zh-CN") {
    return `调整第 ${index + 1} ${axis === "row" ? "行高" : "列宽"}`;
  }
  return `Resize ${axis} ${index + 1}`;
}

/**
 * Reveals a full-axis line from one physically present resize segment.
 *
 * @param anchor - Mounted resize segment owning hover.
 */
function showResizeHover(anchor: QuireMountedTableChromeAnchor): void {
  hoveredResizeId.value = anchor.id;
}

/**
 * Clears the full-axis line when its real resize segment loses hover.
 *
 * @param anchor - Mounted resize segment releasing hover ownership.
 */
function hideResizeHover(anchor: QuireMountedTableChromeAnchor): void {
  if (hoveredResizeId.value === anchor.id) {
    hoveredResizeId.value = null;
  }
}

/**
 * Starts pointer capture for one trailing-edge resize handle.
 *
 * @param event - Initial pointer event.
 * @param anchor - Mounted resize anchor.
 */
function startResize(
  event: PointerEvent,
  anchor: QuireMountedTableChromeAnchor
): void {
  hoveredResizeId.value = null;
  resizeController.start(event, anchor, props.fragment, props.sizing);
}

/**
 * Finishes one resize preview and emits its semantic commit request.
 *
 * @param event - Captured pointer release.
 */
function finishResize(event: PointerEvent): void {
  const request = resizeController.finish(event);
  if (request !== null) {
    emit("resize", request);
  }
}

watch(() => props.identity, () => resizeController.cancel());
onBeforeUnmount(() => resizeController.cancel());
</script>

<template>
  <template v-if="activeInsertion">
    <QuireTooltipRoot :open-delay="420" >
        <QuireTooltipTrigger as-child>
        <button
          type="button"
          class="qk-editor-table__boundary-insert"
          :class="`is-${activeAxis}`"
          :style="createEditorUITableInsertionStyle(activeInsertion, fragment)"
          data-table-scroll-position
          :data-table-insert="activeAxis"
          :data-table-boundary="activeInsertion.boundaryIndex"
          :aria-label="insertionLabel(activeInsertion)"
          @pointerenter="showInsertionPreview(activeInsertion)"
          @pointerleave="hideInsertionPreview(activeInsertion)"
          @pointerdown.prevent.stop
          @focus="showInsertionPreview(activeInsertion)"
          @blur="hideInsertionPreview(activeInsertion)"
          @click="insertAt(activeAxis, activeInsertion)"
        >
          <span aria-hidden="true" />
        </button>
      </QuireTooltipTrigger>
        <QuireTooltipContent :show-arrow="false" :portal-target="teleportTarget">
      {{ insertionLabel(activeInsertion) }}
    </QuireTooltipContent>
      </QuireTooltipRoot>
  </template>

  <div
    v-if="previewedInsertion"
    class="qk-editor-table__insertion-guide"
    :class="previewedInsertion.kind === 'insert-row' ? 'is-row' : 'is-column'"
    :style="createEditorUITableInsertionGuideStyle(
      previewedInsertion,
      fragment
    )"
    data-table-scroll-position
    aria-hidden="true"
    :data-table-insert-guide="previewedInsertion.kind === 'insert-row'
      ? 'row'
      : 'column'"
  />

  <QuireTooltipRoot :open-delay="420" v-if="activeResize">
        <QuireTooltipTrigger as-child>
      <button
        type="button"
        class="qk-editor-table__resize-handle"
        :class="activeResize.kind === 'resize-row' ? 'is-row' : 'is-column'"
        :style="createEditorUITableResizeHandleStyle(activeResize)"
        data-table-scroll-position
        :data-table-resize="activeResize.kind === 'resize-row' ? 'row' : 'column'"
        :data-table-resize-id="activeResize.id"
        :data-table-index="activeResize.rowIndex ?? activeResize.columnIndex"
        :aria-label="resizeLabel(activeResize)"
        tabindex="-1"
        @pointerenter="showResizeHover(activeResize)"
        @pointerleave="hideResizeHover(activeResize)"
        @pointerdown.prevent.stop="startResize($event, activeResize)"
        @pointermove.prevent="resizeController.update($event)"
        @pointerup.prevent.stop="finishResize"
        @pointercancel="resizeController.cancel($event)"
        @lostpointercapture="resizeController.cancel($event)"
        @click.prevent.stop
      />
    </QuireTooltipTrigger>
        <QuireTooltipContent :show-arrow="false" :portal-target="teleportTarget">
    {{ resizeLabel(activeResize) }}
  </QuireTooltipContent>
      </QuireTooltipRoot>

  <div
    v-if="hoveredResize && !resizeController.preview.value"
    class="qk-editor-table__resize-hover-guide"
    :class="hoveredResize.kind === 'resize-row' ? 'is-row' : 'is-column'"
    :style="createEditorUITableResizeHoverGuideStyle(
      hoveredResize,
      fragment
    )"
    data-table-scroll-position
    aria-hidden="true"
    :data-table-resize-hover-guide="hoveredResize.kind === 'resize-row'
      ? 'row'
      : 'column'"
  />

  <div
    v-if="resizeController.preview.value"
    class="qk-editor-table__resize-guide"
    :class="`is-${resizeController.preview.value.axis}`"
    :style="createEditorUITableResizeGuideStyle(
      resizeController.preview.value
    )"
    data-table-scroll-position
    aria-hidden="true"
    data-table-resize-guide
  />
</template>
