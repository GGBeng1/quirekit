<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";
import { QuireTooltipRoot, QuireTooltipTrigger, QuireTooltipContent } from "@quirekit/ui/vue";
import type { EditorUITableChromeProps, EditorUITableInsertionRequest, EditorUITableMoveRequest, EditorUITableResizeRequest } from "./types";
import { createEditorUITableColumnBarStyle, createEditorUITableRowBarStyle, createEditorUITableMoveGuideStyle } from "./geometry";
import { createEditorUITableMoveController } from "./reorder-session";
import { createEditorUITableRailLabel } from "./rail/label";
import { useEditorUITableRailNeighborhood } from "./rail/neighborhood";
import { useTableResizeHover } from "./rail/hit/hover";
import TableBoundaries from "./boundaries.vue";
import "./styles.css";
const props = defineProps<EditorUITableChromeProps>();
const emit = defineEmits<{
 select: [mode: "row" | "column" | "table", index: number | undefined, extend: boolean];
 insert: [request: EditorUITableInsertionRequest]; resize: [request: EditorUITableResizeRequest]; move: [request: EditorUITableMoveRequest];
}>();
const moveController = createEditorUITableMoveController();
const pointerResizeId = useTableResizeHover(() => props.hitFragment, () => props.interactionRoot ?? props.teleportTarget);
const { activeAxis, activeBoundaryIndex, activeColumn, activeRow, activateRailNeighbor, moveRovingHandle } = useEditorUITableRailNeighborhood(
 () => props.fragment, () => props.rowIndex, () => props.columnIndex, () => props.teleportTarget);
let suppressNextBarClick = false;
/** @param axis - Structural axis. @param index - Source index. @returns Whether this handle may reorder. */
function movable(axis: "row" | "column", index: number | undefined): boolean {
 const source = props.moveSource(axis); return index !== undefined && source !== null && index >= source.from && index <= source.to;
}
/**
 * Selects one bar unless the click completes a drag gesture.
 *
 * @param event - Completed bar click carrying keyboard modifiers.
 * @param mode - Row, column, or whole-table selection mode.
 * @param index - Optional source axis index.
 */
function activateBar(
  event: MouseEvent,
  mode: "row" | "column" | "table",
  index?: number
): void {
  if (suppressNextBarClick) {
    suppressNextBarClick = false;
    return;
  }
  emit("select", mode, index, event.shiftKey && mode !== "table");
}

/**
 * Starts reordering only from a matching structural axis selection.
 *
 * @param event - Pointer-down event on one axis bar.
 * @param axis - Row or column axis.
 */
function startMove(
  event: PointerEvent,
  axis: "row" | "column"
): void {
  const source = props.moveSource(axis);
  if (source !== null) {
    moveController.start(event, source, props.fragment);
  }
}

/**
 * Finishes one selected-bar gesture and emits a non-noop move.
 *
 * @param event - Captured pointer release.
 */
function finishMove(event: PointerEvent): void {
  const result = moveController.finish(event);
  if (result === null) {
    return;
  }
  suppressNextBarClick = result.didDrag;
  if (result.request !== null) {
    emit("move", result.request);
  }
}

watch(() => props.identity, () => moveController.cancel());
onBeforeUnmount(() => moveController.cancel());
</script>
<template>
  <Teleport :to="teleportTarget">
    <div
      class="qk-editor-table__chrome"
      role="group"
      :aria-label="locale === 'zh-CN' ? '表格操作' : 'Table actions'"
      data-classic-context-from-selection
      :data-table-selection-owned="selectionOwned"
    >
      <span
        v-for="guide in fragment.guides"
        :key="guide.id"
        class="qk-editor-table__grid-guide"
        :class="`is-${guide.orientation}`"
        :style="{
          left: `${guide.rect.left}px`,
          top: `${guide.rect.top}px`,
          width: `${guide.rect.right - guide.rect.left}px`,
          height: `${guide.rect.bottom - guide.rect.top}px`
        }"
        data-table-scroll-position
        data-table-grid-guide
        aria-hidden="true"
      />

      <span
        class="qk-editor-table__corner-anchor"
        :style="{
          left: `${fragment.tableRect.left - 13}px`,
          top: `${fragment.tableRect.top - 13}px`
        }"
        data-table-scroll-position
      >
        <slot name="corner" :selected="selected('table')" :activate="(event: MouseEvent) => activateBar(event, 'table')">
          <button class="qk-editor-table__corner" type="button" data-table-bar="table"
            :class="{ 'is-selected': selected('table') }" :aria-label="locale === 'zh-CN' ? '选择整个表格' : 'Select table'"
            @pointerdown.prevent @click.stop="activateBar($event, 'table')">⋮</button>
        </slot>
      </span>

      <div
        class="qk-editor-table__column-rail"
        :style="{
          left: `${fragment.tableRect.left}px`,
          top: `${fragment.tableRect.top - 13}px`,
          width: `${fragment.tableRect.right - fragment.tableRect.left}px`,
          backgroundImage: columnBackground,
          pointerEvents: 'auto'
        }"
        data-table-scroll-position
        data-table-rail="column"
        aria-hidden="true"
        @pointermove="activateRailNeighbor($event, 'column')"
      />

      <div
        class="qk-editor-table__row-rail"
        :style="{
          left: `${fragment.tableRect.left - 13}px`,
          top: `${fragment.tableRect.top}px`,
          height: `${fragment.tableRect.bottom - fragment.tableRect.top}px`,
          backgroundImage: rowBackground,
          pointerEvents: 'auto'
        }"
        data-table-scroll-position
        data-table-rail="row"
        aria-hidden="true"
        @pointermove="activateRailNeighbor($event, 'row')"
      />

      <QuireTooltipRoot :open-delay="420" v-if="activeAxis === 'column' && activeColumn">
        <QuireTooltipTrigger as-child>
          <button
            type="button"
            class="qk-editor-table__column-bar"
            :class="{
              'is-current': current('column', activeColumn.columnIndex),
              'is-selected': selected('column', activeColumn.columnIndex),
              'is-movable': movable('column', activeColumn.columnIndex)
            }"
            :style="createEditorUITableColumnBarStyle(activeColumn)"
            data-table-scroll-position
            data-table-bar="column"
            :data-table-column="activeColumn.columnIndex"
            :data-table-current="current('column', activeColumn.columnIndex)"
            :aria-label="createEditorUITableRailLabel(
              locale,
              'column',
              activeColumn.columnIndex ?? 0,
              movable('column', activeColumn.columnIndex)
            )"
            :aria-pressed="selected('column', activeColumn.columnIndex)"
            tabindex="0"
            @focus="activeAxis = 'column'"
            @keydown="moveRovingHandle($event, 'column')"
            @pointerdown.prevent.stop="startMove($event, 'column')"
            @pointermove.prevent="moveController.update($event)"
            @pointerup.prevent.stop="finishMove"
            @pointercancel="moveController.cancel($event)"
            @lostpointercapture="moveController.cancel($event)"
            @click.prevent.stop="
              activateBar($event, 'column', activeColumn.columnIndex)
            "
          >
            <span
              v-if="movable('column', activeColumn.columnIndex)"
              data-table-reorder-grip
              aria-hidden="true"
            />
          </button>
        </QuireTooltipTrigger>
        <QuireTooltipContent :show-arrow="false" :portal-target="teleportTarget">
        {{ createEditorUITableRailLabel(
          locale,
          'column',
          activeColumn.columnIndex ?? 0,
          movable('column', activeColumn.columnIndex)
        ) }}
      </QuireTooltipContent>
      </QuireTooltipRoot>

      <QuireTooltipRoot :open-delay="420" v-if="activeAxis === 'row' && activeRow">
        <QuireTooltipTrigger as-child>
          <button
            type="button"
            class="qk-editor-table__row-bar"
            :class="{
              'is-current': current('row', activeRow.rowIndex),
              'is-selected': selected('row', activeRow.rowIndex),
              'is-movable': movable('row', activeRow.rowIndex)
            }"
            :style="createEditorUITableRowBarStyle(activeRow)"
            data-table-scroll-position
            data-table-bar="row"
            :data-table-row="activeRow.rowIndex"
            :data-table-current="current('row', activeRow.rowIndex)"
            :aria-label="createEditorUITableRailLabel(
              locale,
              'row',
              activeRow.rowIndex ?? 0,
              movable('row', activeRow.rowIndex)
            )"
            :aria-pressed="selected('row', activeRow.rowIndex)"
            tabindex="0"
            @focus="activeAxis = 'row'"
            @keydown="moveRovingHandle($event, 'row')"
            @pointerdown.prevent.stop="startMove($event, 'row')"
            @pointermove.prevent="moveController.update($event)"
            @pointerup.prevent.stop="finishMove"
            @pointercancel="moveController.cancel($event)"
            @lostpointercapture="moveController.cancel($event)"
            @click.prevent.stop="activateBar($event, 'row', activeRow.rowIndex)"
          >
            <span
              v-if="movable('row', activeRow.rowIndex)"
              data-table-reorder-grip
              aria-hidden="true"
            />
          </button>
        </QuireTooltipTrigger>
        <QuireTooltipContent :show-arrow="false" :portal-target="teleportTarget">
        {{ createEditorUITableRailLabel(
          locale,
          'row',
          activeRow.rowIndex ?? 0,
          movable('row', activeRow.rowIndex)
        ) }}
      </QuireTooltipContent>
      </QuireTooltipRoot>

      <div
        v-if="moveController.preview.value"
        class="qk-editor-table__reorder-guide"
        :class="`is-${moveController.preview.value.axis}`"
        :style="createEditorUITableMoveGuideStyle(
          moveController.preview.value
        )"
        data-table-scroll-position
        aria-hidden="true"
        data-table-reorder-guide
      />

      <TableBoundaries :teleport-target="teleportTarget"
        :fragment="fragment"
        :sizing="sizing" :identity="identity"
        :pointer-resize-id="pointerResizeId"
        :locale="locale"
        :owner-document="ownerDocument" :theme-root="themeRoot"
        :active-axis="activeAxis"
        :active-boundary-index="activeBoundaryIndex"
        :active-row-index="activeRow?.rowIndex ?? rowIndex"
        :active-column-index="activeColumn?.columnIndex ?? columnIndex"
        @insert="emit('insert', $event)"
        @resize="emit('resize', $event)"
      />
    </div>
  </Teleport>
</template>
