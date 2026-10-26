<script setup lang="ts">
import { QuireButton, QuirePopconfirm, QuireTypography } from "@quirekit/ui/vue";
import { nextTick, ref, useId, type HTMLAttributes } from "vue";
import type { ClassicEditorLocale, ClassicEditorWebFontFamily } from "@classic/types";
import type { ClassicFontHubController, ClassicFontHubMessageResolver } from "../types";
import {
  resolveClassicFontPreviewFamily,
  resolveClassicFontPreviewText,
  resolveClassicFontScriptLabels
} from "../font-preview";

/** One explicitly previewed, source-neutral font row. */
interface Props {
  /** Exact catalog record. */
  readonly family: ClassicEditorWebFontFamily;
  /** Shared resource operations. */
  readonly hub: ClassicFontHubController;
  /** Active display locale. */
  readonly locale: ClassicEditorLocale;
  /** Localized copy. */
  readonly message: ClassicFontHubMessageResolver;
  /** Localized provider category. */
  readonly categoryLabel: string;
  /** Local-only comparison text; blank uses script-aware sample. */
  readonly sample: string;
  /** Selected specimen size in CSS pixels. */
  readonly size: string;
  /** Shows confirmed destructive removal for retained fonts. */
  readonly managed?: boolean;
  /** Theme and overlay ownership for the confirmation surface. */
  readonly popupProps?: HTMLAttributes;
  /** Stable focus target after the removed row unmounts. */
  readonly removalFocusEl?: () => HTMLElement | null;
}
const props = defineProps<Props>();
const expanded = ref(false);
const previewId = useId();
const row = ref<HTMLElement | null>(null);
/** @returns The removal trigger on cancel, or the surviving list search after deletion. */
function finalFocusEl(): HTMLElement | null {
  return row.value?.querySelector<HTMLElement>("[data-font-remove]") ?? props.removalFocusEl?.() ?? null;
}

/** @returns Removal success, preserving the confirmation on failure. */
async function confirmRemoval(): Promise<boolean> {
  const removed = await props.hub.removeFont(props.family);
  if (removed) {
    // Removing the row unmounts its Popconfirm before its close transition can restore focus.
    await nextTick();
    const target = props.removalFocusEl?.();
    if (target?.isConnected && target.getClientRects().length) target.focus({ preventScroll: true });
  }
  return removed;
}

/**
 * Toggles a ready specimen or explicitly loads its font.
 * @returns Completion after optional loading.
 */
async function togglePreview(): Promise<void> {
  if (props.hub.isPreviewReady(props.family)) {
    expanded.value = !expanded.value;
    return;
  }
  expanded.value = true;
  await props.hub.previewFont(props.family);
}
</script>

<template>
  <article
    ref="row"
    class="qk-font-hub__font-card"
    :data-family-state="
      hub.isPending(family) ? 'pending' : hub.isMounted(family) ? 'mounted' : hub.isImported(family) ? 'imported' : 'available'
    "
  >
    <div class="qk-font-hub__font-copy">
      <QuireTypography variant="control">
        {{ family.displayName || family.family }}
      </QuireTypography>
      <div class="qk-font-hub__font-meta">
        <QuireTypography as="span" variant="helper">
          {{ categoryLabel || family.sourceLabel }}
        </QuireTypography>
        <QuireTypography
          v-for="script in resolveClassicFontScriptLabels(family, locale)"
          :key="script"
          as="span"
          variant="helper"
          class="qk-font-hub__font-script"
        >
          {{ script }}
        </QuireTypography>
        <QuireTypography
          v-if="family.displayName && family.displayName !== family.family"
          class="qk-font-hub__font-identity"
          as="span"
          variant="helper"
          :title="family.family"
          >{{ family.family }}</QuireTypography
        >
        <QuireTypography as="span" variant="helper">
          <a
            :href="family.license.url"
            :title="family.license.name"
            target="_blank"
            rel="noreferrer"
          >
            {{ message("licenseInformation") }}
          </a>
        </QuireTypography>
      </div>
    </div>
    <div class="qk-font-hub__row-actions">
      <QuireButton
        variant="ghost"
        size="sm"
        :busy="hub.isPreviewing(family)"
        :disabled="hub.isPending(family)"
        :aria-expanded="expanded"
        :aria-controls="previewId"
        @click="togglePreview"
      >
        {{
          expanded && hub.isPreviewReady(family)
            ? message("collapseFontPreview")
            : message("previewFont")
        }}
      </QuireButton>
      <QuirePopconfirm
        v-if="managed"
        v-bind="popupProps"
        :title="message('confirmRemoveFont')"
        :description="message('fontRemoveNotice')"
        :confirm-label="message('removeFont')"
        :confirm-action="confirmRemoval"
        :final-focus-el="finalFocusEl"
        :disabled="hub.isPreviewing(family)"
        placement="left-start"
        danger
      >
        <QuireButton data-font-remove variant="ghost" color="danger" size="sm" :busy="hub.isPending(family)">
          {{ message("removeFont") }}
        </QuireButton>
      </QuirePopconfirm>
      <QuireButton
        v-else
        variant="outline"
        size="sm"
        :busy="hub.isPending(family)"
        :disabled="hub.importingRecommended.value || hub.isAvailable(family) || hub.isPreviewing(family)"
        @click="hub.importFont(family)"
      >
        {{
          hub.isPending(family)
            ? message("importingFont")
            : hub.isMounted(family)
            ? `✓ ${message("available")}`
            : hub.isImported(family)
            ? `✓ ${message("imported")}`
            : hub.isAvailable(family)
            ? `✓ ${message("available")}`
            : message("importFont")
        }}
      </QuireButton>
    </div>
    <QuireTypography
      v-if="expanded && hub.isPreviewReady(family)"
      :id="previewId"
      class="qk-font-hub__font-specimen"
      variant="body"
      :style="{ fontFamily: resolveClassicFontPreviewFamily(family), fontSize: `${size}px` }"
    >
      {{ sample.trim() || resolveClassicFontPreviewText(family) }}
    </QuireTypography>
  </article>
</template>
