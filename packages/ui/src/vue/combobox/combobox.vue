<script setup lang="ts">
import { useQuireOverlayHost } from "../overlay-provider";
import QuireThemePortal from "../theme-provider/portal.vue";
import { shallowRef, type StyleValue } from "vue";
import { Combobox } from "@ark-ui/vue/combobox";
import type {
  QuireKitComboboxProps,
  QuireKitComboboxSlots
} from "../../components/combobox/types";
import QuireIcon from "../icon/icon.vue";
import { useModalPortal } from "../shared/surface/use-modal-portal";
import { useComboboxForm } from "./form";
import { useComboboxModel } from "./use-combobox-model";
import { useQuireKitMessages } from "../locale-provider/context";

/** 可搜索单选表单控件的公开事件。 */
interface Emits {
  /** 同步受控的单个语义值。 */
  "update:modelValue": [value: string | undefined];
  /** 用户完成一次值选择或清除。 */
  valueChange: [value: string | undefined];
  /** 同步受控的可见输入文本。 */
  "update:inputValue": [value: string];
  /** 用户输入、选择或清除后可见文本发生变化。 */
  inputValueChange: [value: string];
  /** 浮层打开状态发生变化。 */
  openChange: [open: boolean];
  /** 同步受控浮层状态。 */
  "update:open": [open: boolean];
}

const portal = useQuireOverlayHost();
const props = withDefaults(defineProps<QuireKitComboboxProps>(), {
  open: undefined,
  showSearchIcon: true,
  size: "sm",
  variant: "outline",
  width: "200px",
  border: "none",
  placement: "bottom-start",
  filter: "contains",
  loading: false,
  allowCustomValue: false,
  openOnClick: true,
  clearable: true,
  portalled: true,
  disabled: false,
  invalid: false,
  required: false,
  readOnly: false
});
const emit = defineEmits<Emits>();
const text = useQuireKitMessages("combobox");
defineSlots<QuireKitComboboxSlots>();
const {
  collection,
  contentStyle,
  controlStyle,
  groupedItems,
  inputValue: visibleInputValue,
  open: comboboxOpen,
  optionalRootBindings,
  positioning,
  reset,
  selectedValues,
  updateInputValue,
  updateOpen,
  updateValue
} = useComboboxModel(props, emit);
const formField = shallowRef<HTMLInputElement | null>(null);
useComboboxForm(props, formField, () => selectedValues.value[0], () => visibleInputValue.value, reset, () => text.value.required);
const { hasModalOwner: ownedByModal, disabled: portalDisabled } = useModalPortal(() => props.portalled, () => comboboxOpen.value);
</script>

<template>
  <Combobox.Root
    v-bind="optionalRootBindings"
    :collection="collection"
    :model-value="selectedValues"
    :input-value="visibleInputValue"
    :open="comboboxOpen"
    :placeholder="placeholder ?? text.placeholder"
    :disabled="disabled"
    :invalid="invalid"
    :read-only="readOnly"
    :allow-custom-value="allowCustomValue"
    :open-on-click="openOnClick"
    :open-on-change="true"
    :close-on-select="true"
    :selection-behavior="'replace'"
    :input-behavior="'autohighlight'"
    :loop-focus="true"
    :lazy-mount="true"
    :unmount-on-exit="true"
    :positioning="positioning"
    class="qk-combobox"
    @update:model-value="updateValue"
    @update:input-value="updateInputValue"
    @update:open="updateOpen"
  >
    <Combobox.Label class="qk-combobox__label">{{ label }}</Combobox.Label>
    <Combobox.Control
      :style="controlStyle"
      :class="['qk-combobox__control', `qk-combobox__control--${size}`]"
      :data-variant="variant"
    >
      <span v-if="showSearchIcon" aria-hidden="true" class="qk-combobox__search-icon">
        <QuireIcon name="search" :size="16" />
      </span>
      <Combobox.Input :required="false" :aria-required="required || undefined" class="qk-combobox__input" />
      <span v-if="clearable" class="qk-combobox__clear-slot">
        <Combobox.ClearTrigger
          v-if="visibleInputValue.length > 0 && !readOnly"
          :aria-label="text.clear"
          class="qk-combobox__clear-trigger"
        >
          <QuireIcon name="close" :size="16" />
        </Combobox.ClearTrigger>
      </span>
      <Combobox.Trigger :aria-label="text.open" class="qk-combobox__trigger">
        <QuireIcon name="chevronDown" :size="16" />
      </Combobox.Trigger>
    </Combobox.Control>

    <Teleport :to="portal.target.value" :disabled="portalDisabled">
      <QuireThemePortal>
        <Combobox.Positioner :class="['qk-combobox__positioner', ownedByModal && 'qk-combobox__positioner--modal']">
          <Combobox.Content
            v-bind="contentProps"
            :style="[contentStyle, contentProps?.style as StyleValue]"
            :class="[contentProps?.class, 'qk-combobox__content', `qk-combobox__content--${contentDensity ?? (size === 'xs' || size === 'sm' ? 'compact' : 'regular')}`, `qk-combobox__content--border-${border}`]"
          >
            <div v-if="loading" class="qk-combobox__status" role="status">
              <slot name="loading">{{ text.loading }}</slot>
            </div>
            <Combobox.List v-else class="qk-combobox__list">
              <Combobox.Empty class="qk-combobox__status">
                <slot name="empty">{{ text.empty }}</slot>
              </Combobox.Empty>
              <template v-for="group in groupedItems" :key="group.label === undefined ? 'ungrouped' : `group:${group.label}`">
                <Combobox.ItemGroup v-if="group.label !== undefined" class="qk-combobox__group">
                  <Combobox.ItemGroupLabel class="qk-combobox__group-label">
                    <slot name="groupLabel" v-bind="group">{{ group.label }}</slot>
                  </Combobox.ItemGroupLabel>
                  <Combobox.Item
                    v-for="item in group.items"
                    :key="item.value"
                    :item="item"
                    class="qk-combobox__item"
                  >
                    <Combobox.ItemText class="qk-combobox__item-text">
                      <slot name="item" :item="item">
                        <span class="qk-combobox__item-label">{{ item.label }}</span>
                      </slot>
                    </Combobox.ItemText>
                    <Combobox.ItemIndicator class="qk-combobox__item-indicator">
                      <QuireIcon name="check" :size="16" />
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                </Combobox.ItemGroup>
                <template v-else>
                  <Combobox.Item
                    v-for="item in group.items"
                    :key="item.value"
                    :item="item"
                    class="qk-combobox__item"
                  >
                    <Combobox.ItemText class="qk-combobox__item-text">
                      <slot name="item" :item="item">
                        <span class="qk-combobox__item-label">{{ item.label }}</span>
                      </slot>
                    </Combobox.ItemText>
                    <Combobox.ItemIndicator class="qk-combobox__item-indicator">
                      <QuireIcon name="check" :size="16" />
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                </template>
              </template>
            </Combobox.List>
          </Combobox.Content>
        </Combobox.Positioner>
      </QuireThemePortal>
    </Teleport>
    <!-- Ark's text input owns editing; this field submits the selected semantic value. -->
    <input ref="formField" type="hidden" :name="name" :form="form" :value="selectedValues[0] ?? ''" :disabled="disabled" />
  </Combobox.Root>
</template>
