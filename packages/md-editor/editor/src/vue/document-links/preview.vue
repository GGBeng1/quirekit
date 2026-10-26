<script setup lang="ts">
import type { MsfeEditor } from "@quirekit/msfe-core";
import { QuirePopoverAnchor, QuirePopoverContent, QuirePopoverRoot } from "@quirekit/ui/vue";
import type { MdDocumentLinks, MdDocumentPreview } from "../../commands/types";
import { useMdOverlayTarget } from "../overlays/context";
import { useLinkHover } from "../text-links/hover";
import { mdEditorMessages } from "../messages";
import MdProse from "../prose.vue";
import type { MdEditorLocale } from "../types";

// Hover preview of a linked document, rendered as read-only prose so no extra editor is mounted.
const props = defineProps<{
  /** Mounted editor whose document links are hovered. */ editor: MsfeEditor;
  /** Host preview loader. */ preview: NonNullable<MdDocumentLinks["preview"]>;
  /** Control language. */ locale: MdEditorLocale;
}>();

const portal = useMdOverlayTarget();
const { anchor, content, keepOpen, scheduleClose, close } = useLinkHover<{ preview: MdDocumentPreview; url: string }>(() => props.editor, linkAt, async (link, signal) => {
  const url = link.dataset.msfeUrl ?? "";
  const preview = await props.preview(url, signal);
  return preview ? { preview, url } : null;
});

/** @param target - Event target. @returns The document reference containing it, if any. */
function linkAt(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>("a[data-msfe-reference=document]") : null;
}
</script>

<template>
  <QuirePopoverRoot :open="!!anchor" placement="bottom-start" :auto-focus="false" :restore-focus="false" @update:open="open => { if (!open) close(); }">
    <QuirePopoverAnchor><span class="md-document-preview__anchor" :style="anchor ?? undefined" /></QuirePopoverAnchor>
    <QuirePopoverContent v-if="anchor && content" width="min(440px, calc(100vw - 32px))" padding="none" :portal-target="portal ?? 'body'"
      @pointerenter="keepOpen" @pointerleave="scheduleClose">
      <div class="md-document-preview" data-md-document-preview>
        <div class="md-document-preview__body">
          <MdProse :content="content.preview.markdown" :identity="content.url" :locale="locale" />
        </div>
        <footer class="md-document-preview__footer">
          <span class="md-document-preview__description">{{ content.preview.description }}</span>
          <a class="md-document-preview__open" :href="content.url" @click="close">{{ mdEditorMessages[locale].openDocument }}</a>
        </footer>
      </div>
    </QuirePopoverContent>
  </QuirePopoverRoot>
</template>

<style scoped>
.md-document-preview__anchor { position: fixed; width: 1px; height: 1px; pointer-events: none; }
.md-document-preview { display: grid; min-width: 0; }
.md-document-preview__body { max-height: min(360px, 50vh); padding: 12px 16px; overflow: hidden; pointer-events: none; mask-image: linear-gradient(to bottom, #000 85%, transparent); }
/* Scale the whole document down like a thumbnail so headings and body keep their proportions. */
.md-document-preview__body > * { zoom: 0.72; }
.md-document-preview__footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 16px; border-top: 1px solid var(--qk-color-border-subtle); background: var(--qk-color-surface-subtle); font-size: 12.5px; }
.md-document-preview__description { min-width: 0; overflow: hidden; color: var(--qk-color-text-tertiary); text-overflow: ellipsis; white-space: nowrap; }
.md-document-preview__open { flex: none; color: var(--qk-color-text-secondary); }
.md-document-preview__open:hover { color: var(--qk-color-text-primary); text-decoration: underline; text-underline-offset: 3px; }
</style>
