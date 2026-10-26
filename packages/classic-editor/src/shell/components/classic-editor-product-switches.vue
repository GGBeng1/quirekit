<script setup lang="ts">
import type { QuireKitMenuEntry } from "@quirekit/ui";
import { QuireIcon, QuireIconButton, QuireMenu, QuireTooltipContent, QuireTooltipRoot, QuireTooltipTrigger } from "@quirekit/ui/vue";
import type { ClassicEditorLocale } from "@classic/types";
import { computed, toRef } from "vue";
import { useClassicEditorShellContributions } from "../composables/use/shell-contributions";
import { useClassicThemePreference } from "../composables/use/theme-preference";
import { useClassicEditorOverlay } from "../overlays/registry";
import type { ClassicEditorShellModel } from "../types";

/** Reactive inputs required by the product configuration switches. */
interface ClassicEditorProductSwitchesProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
  /** Active product interface locale. */
  readonly locale: ClassicEditorLocale;
}

/** One selectable value of a product switch. */
interface SwitchOption {
  /** Localized choice label. */
  readonly label: string;
  /** Stable choice value. */
  readonly value: string;
}

/** One switch projected into a single-choice menu and its trigger name. */
interface SwitchMenu {
  /** Menu label naming the setting. */
  readonly label: string;
  /** Accessible name and tooltip, including the current choice. */
  readonly title: string;
  /** Single radio group whose checked item is the current choice. */
  readonly items: readonly QuireKitMenuEntry[];
}

const props = defineProps<ClassicEditorProductSwitchesProps>();
const { message } = useClassicEditorShellContributions(toRef(props, "model"));
const appearance = useClassicThemePreference(toRef(props, "model"));
// Ark owns outside-pointer, Escape and focus return. Classic only coordinates
// exclusivity with the remaining product surfaces and releases ownership on unmount.
const dismissal = { dismissOnOutsidePointer: () => false, dismissOnEscape: () => false };
const backendOverlay = useClassicEditorOverlay("backend-select", undefined, undefined, undefined, dismissal);
const localeOverlay = useClassicEditorOverlay("locale-select", undefined, undefined, undefined, dismissal);
const themeOverlay = useClassicEditorOverlay("theme-select", undefined, undefined, undefined, dismissal);
const backend = computed(() => props.model.context?.backend ?? props.model.backend);
const backendOptions: readonly SwitchOption[] = [{ label: "Canvas", value: "canvas" }, { label: "SVG", value: "svg" }];
const localeOptions: readonly SwitchOption[] = [{ label: "中文", value: "zh-CN" }, { label: "English", value: "en" }];
const themeIcons: Readonly<Record<string, string>> = { light: "sun", dark: "moon", system: "sunMoon" };
const signatures = new WeakMap<SwitchMenu, string>();
const themeMenu = useSwitchMenu("theme",
  () => (props.locale === "en" ? "Appearance" : "外观"),
  () => appearance.preference.value,
  () => [
    { label: props.locale === "en" ? "Light" : "浅色", value: "light" },
    { label: props.locale === "en" ? "Dark" : "深色", value: "dark" },
    { label: props.locale === "en" ? "System" : "跟随系统", value: "system" }
  ]);
const backendMenu = useSwitchMenu("backend", () => message("renderingBackend"), () => backend.value, () => backendOptions);
const localeMenu = useSwitchMenu("locale", () => message("interfaceLanguage"), () => props.locale, () => localeOptions);
const themeContentProps = computed(() => ({ ...themeOverlay.ownerAttributes, lang: props.locale }));
const backendContentProps = computed(() => ({ ...backendOverlay.ownerAttributes, lang: props.locale }));
const localeContentProps = computed(() => ({ ...localeOverlay.ownerAttributes, lang: props.locale }));
/** @param value - Optional controlled menu visibility from the public Menu. */
const setThemeOpen = (value: boolean | undefined): void => themeOverlay.setVisible(value === true);
/** @param value - Optional controlled menu visibility from the public Menu. */
const setBackendOpen = (value: boolean | undefined): void => backendOverlay.setVisible(value === true);
/** @param value - Optional controlled menu visibility from the public Menu. */
const setLocaleOpen = (value: boolean | undefined): void => localeOverlay.setVisible(value === true);
const switches = computed(() => [{
  id: "theme",
  icon: themeIcons[appearance.preference.value] ?? "sunMoon",
  menu: themeMenu.value,
  contentProps: themeContentProps.value,
  overlay: themeOverlay,
  setOpen: setThemeOpen,
  select: selectTheme
}, {
  id: "backend",
  icon: "appWindow",
  menu: backendMenu.value,
  contentProps: backendContentProps.value,
  overlay: backendOverlay,
  setOpen: setBackendOpen,
  select: selectBackend
}, {
  id: "locale",
  icon: "languages",
  menu: localeMenu.value,
  contentProps: localeContentProps.value,
  overlay: localeOverlay,
  setOpen: setLocaleOpen,
  select: selectLocale
}]);

/**
 * Builds a switch menu that keeps its identity while label, value and choices are unchanged,
 * so shell context refreshes do not rerender the header triggers.
 * @param id - Stable radio group value.
 * @param label - Setting name reader.
 * @param value - Current choice reader.
 * @param options - Choice reader.
 * @returns Reactive menu projection.
 */
function useSwitchMenu(
  id: string,
  label: () => string,
  value: () => string,
  options: () => readonly SwitchOption[]
) {
  return computed<SwitchMenu>((previous) => {
    const name = label();
    const current = value();
    const choices = options();
    const signature = JSON.stringify([name, current, choices, props.locale]);
    if (previous !== undefined && signatures.get(previous) === signature) return previous;
    const currentLabel = choices.find(option => option.value === current)?.label;
    const menu: SwitchMenu = {
      label: name,
      title: currentLabel === undefined ? name : `${name}${props.locale === "en" ? ": " : "："}${currentLabel}`,
      items: [{
        value: id,
        kind: "radio-group",
        label: name,
        selectedValue: current,
        children: choices.map(option => ({ value: option.value, label: option.label }))
      }]
    };
    signatures.set(menu, signature);
    return menu;
  });
}

/** @param value - Chosen appearance mode. */
function selectTheme(value: string | undefined): void {
  themeOverlay.close();
  appearance.select(value);
}

/**
 * Selects a render backend through the public update lifecycle.
 * @param value - Public menu value, validated at the product boundary.
 */
function selectBackend(value: string | undefined): void {
  if (value !== "canvas" && value !== "svg") return;
  backendOverlay.close();
  if (value !== (props.model.context?.backend ?? props.model.backend)) {
    props.model.context?.instance.update({ view: { backend: value } });
  }
}

/**
 * Selects interface language without changing document content.
 * @param value - Public menu value, validated at the product boundary.
 */
function selectLocale(value: string | undefined): void {
  if (value !== "zh-CN" && value !== "en") return;
  localeOverlay.close();
  if (value !== props.locale) props.model.context?.instance.update({ locale: value });
}
</script>

<template>
  <div class="qk-classic-editor__product-switches">
    <!-- Tooltip wraps the Menu so both triggers merge onto one icon button; the Tooltip adopts the Menu's trigger id so the menu keeps its anchor. -->
    <QuireTooltipRoot
      v-for="control in switches"
      :key="control.id"
      :trigger-id="`menu:qk-classic-switch-${control.id}:trigger`"
      :disabled="control.overlay.isVisible()"
      :open-delay="420"
      placement="bottom"
    >
      <QuireMenu
        :id="`qk-classic-switch-${control.id}`"
        v-bind="control.contentProps"
        :items="control.menu.items"
        :aria-label="control.menu.label"
        :data-classic-switch="control.id"
        :open="control.overlay.isVisible()"
        placement="bottom-end"
        min-width="128px"
        @update:open="control.setOpen"
        @select="control.select"
      >
        <template #trigger>
          <QuireTooltipTrigger as-child>
            <QuireIconButton
              v-bind="control.overlay.ownerAttributes"
              :class="`qk-classic-editor__${control.id}-select`"
              :label="control.menu.title"
              variant="ghost"
              size="sm"
            ><QuireIcon :name="control.icon" :size="16" /></QuireIconButton>
          </QuireTooltipTrigger>
        </template>
      </QuireMenu>
      <QuireTooltipContent :content="control.menu.title" />
    </QuireTooltipRoot>
  </div>
</template>
