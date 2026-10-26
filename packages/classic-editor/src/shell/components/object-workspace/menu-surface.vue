<script setup lang="ts">
import { QuireButton, QuireTooltipRoot, QuireTooltipTrigger, QuireTooltipContent } from "@quirekit/ui/vue";
import { computed, ref } from "vue";
import { resolveClassicEditorText } from "@classic/localization";
import type {
  ClassicEditorActionDefinition,
  ClassicEditorActionState,
  ClassicEditorObjectMenuControl,
  ClassicEditorObjectWorkspaceController
} from "@classic/types";

import SvgIcon from "../svg-icon.vue";

/** Action sources admitted by the exact-target object controller. */
type ClassicEditorObjectSurfaceSource = Parameters<
  ClassicEditorObjectWorkspaceController["execute"]
>[1];

/** Inputs for the reusable exact-action icon-grid menu. */
interface ClassicEditorObjectMenuSurfaceProps {
  /** Shared exact-target controller. */
  readonly controller: ClassicEditorObjectWorkspaceController;
  /** Ordered icon-grid menu definition. */
  readonly control: ClassicEditorObjectMenuControl;
  /** Canonical action source used for state resolution and execution. */
  readonly source?: ClassicEditorObjectSurfaceSource | undefined;
}

const props = withDefaults(defineProps<ClassicEditorObjectMenuSurfaceProps>(), {
  source: "contextual-popup"
});
const emit = defineEmits<{
  /** Reports whether successful execution should close the containing surface. */
  executed: [shouldClose: boolean];
  /** Requests transient-surface close and trigger focus restoration. */
  "request-close": [];
}>();
const surface = ref<HTMLElement>();
const locale = computed(() => props.controller.context.locale);

/** Focuses the first enabled icon-grid item. */
function focusFirst(): void {
  surface.value?.querySelector<HTMLButtonElement>("button:not(:disabled)")
    ?.focus({ preventScroll: true });
}

/**
 * Resolves one nested action against the same retained exact target.
 *
 * @param action - Exact action retained by this menu.
 * @returns Current command eligibility and selected state.
 */
function state(action: ClassicEditorActionDefinition): ClassicEditorActionState {
  return props.controller.resolveActionState(action, props.source)
    ?? Object.freeze({ available: false, canExecute: false, active: false, reason: null });
}

/**
 * Executes one retained menu action.
 *
 * @param action - Exact direct action selected by the user.
 */
async function execute(action: ClassicEditorActionDefinition): Promise<void> {
  if (!state(action).canExecute) return;
  emit("executed", await props.controller.execute(action, props.source));
}

/** @param action - Direct menu action. @returns Localized accessible label. */
function actionLabel(action: ClassicEditorActionDefinition): string {
  return resolveClassicEditorText(action.label, locale.value);
}

/** @param action - Direct menu action. @returns Whether it belongs to a stateful choice set. */
function isStateful(action: ClassicEditorActionDefinition): boolean {
  return action.isActive !== undefined;
}

/**
 * Handles icon-grid roving and Escape close requests.
 *
 * @param event - Keyboard event originating from the menu surface.
 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.isComposing || event.defaultPrevented) return;
  if (event.key === "Escape") {
    emit("request-close");
    event.preventDefault();
    return;
  }
  const buttons = [...(surface.value?.querySelectorAll<HTMLButtonElement>(
    "button:not(:disabled)"
  ) ?? [])];
  const current = buttons.indexOf(event.target as HTMLButtonElement);
  let next = current;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    next = (current + 1 + buttons.length) % buttons.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    next = (current - 1 + buttons.length) % buttons.length;
  } else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = buttons.length - 1;
  else return;
  buttons[next]?.focus();
  event.preventDefault();
}

defineExpose({ focusFirst });
</script>

<template>
  <div
    ref="surface"
    class="qk-object-picker__groups"
    :data-object-picker="control.id"
    @keydown="handleKeydown"
  >
    <section
      v-for="group in control.groups"
      :key="group.id"
      class="qk-object-picker__group"
      :data-object-picker-group="group.id"
    >
      <h3 v-if="group.label">
        {{ resolveClassicEditorText(group.label, locale) }}
      </h3>
      <div
        class="qk-object-picker__grid"
        :style="{
          gridTemplateColumns: `repeat(${Math.min(group.items.length, 4)}, 32px)`
        }"
      >
        <QuireTooltipRoot
          v-for="menuItem in group.items"
          :key="menuItem.action.id"
          :open-delay="320"
          placement="bottom"
        >
<QuireTooltipTrigger as-child>
            <span class="qk-classic-editor__tooltip-trigger">
              <QuireButton variant="ghost" size="sm"
                class="qk-object-picker__item"
                type="button"
                :role="isStateful(menuItem.action) ? 'menuitemradio' : 'menuitem'"
                :data-object-menu-item="menuItem.action.id"
                :disabled="!state(menuItem.action).canExecute"
                :aria-disabled="!state(menuItem.action).canExecute"
                :aria-checked="isStateful(menuItem.action)
                  ? state(menuItem.action).active
                  : undefined"
                :aria-label="actionLabel(menuItem.action)"
                @pointerdown.prevent
                @click="execute(menuItem.action)"
              >
                <SvgIcon v-if="menuItem.action.icon" :name="menuItem.action.icon" />
                <span :class="menuItem.action.icon ? 'qk-classic-editor__sr-only' : undefined">
                  {{ actionLabel(menuItem.action) }}
                </span>
              </QuireButton>
            </span>
          </QuireTooltipTrigger>
<QuireTooltipContent :portal-target="controller.context.ownerDocument.body" :show-arrow="false">
          {{ actionLabel(menuItem.action) }}
        </QuireTooltipContent>
</QuireTooltipRoot>
      </div>
    </section>
  </div>
</template>
