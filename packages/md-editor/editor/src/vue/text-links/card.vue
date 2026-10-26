<script setup lang="ts">
import { EditorView } from "@quirekit/cm-view";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { loadTextLinkCard, matchTextLinkUrl, type TextLinkCard } from "@quirekit/msfe-link";
import { QuirePopoverAnchor, QuirePopoverContent, QuirePopoverRoot, QuireTag } from "@quirekit/ui/vue";
import { useMdOverlayTarget } from "../overlays/context";
import { useLinkHover } from "./hover";
import { mdEditorMessages } from "../messages";
import type { MdEditorLocale } from "../types";

// Hover card for links presented by `textLinks()` rules that provide `card`, and for ordinary Markdown
// links a rule claims through `fromHref`.
const props = defineProps<{
  /** Mounted source owner whose state holds the installed rules. */ editor: MsfeEditor;
  /** Control language. */ locale: MdEditorLocale;
}>();

const portal = useMdOverlayTarget();
const { anchor, content: card, keepOpen, scheduleClose, close } = useLinkHover<{ content: TextLinkCard; url: string }>(() => props.editor, linkAt, async (link, signal) => {
  const view = EditorView.findFromDOM(props.editor.element);
  const target = view ? cardTarget(link, view) : null;
  if (!view || !target) return null;
  const content = await loadTextLinkCard(view.state, target.id, target.text, signal);
  return content ? { content, url: link.dataset.msfeUrl ?? "" } : null;
});

/** @param target - Event target. @returns The presented text link or ordinary link containing it, if any. */
function linkAt(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>("a[data-msfe-text-link], a[data-msfe-url]:not([data-msfe-reference])") : null;
}

/** @param link - Hovered link. @param view - Editor view. @returns The rule and text its card loads for, if any rule claims it. */
function cardTarget(link: HTMLElement, view: EditorView): { id: string; text: string } | null {
  const id = link.dataset.msfeTextLink;
  if (id) return { id, text: link.textContent ?? "" };
  return link.dataset.msfeUrl ? matchTextLinkUrl(view.state, link.dataset.msfeUrl) : null;
}
</script>

<template>
  <QuirePopoverRoot :open="!!anchor" placement="bottom-start" :auto-focus="false" :restore-focus="false" @update:open="open => { if (!open) close(); }">
    <QuirePopoverAnchor><span class="md-text-link-card__anchor" :style="anchor ?? undefined" /></QuirePopoverAnchor>
    <QuirePopoverContent v-if="anchor && card" width="min(300px, calc(100vw - 32px))" :portal-target="portal ?? 'body'"
      @pointerenter="keepOpen" @pointerleave="scheduleClose">
      <div class="md-text-link-card" data-md-text-link-card>
        <span v-if="card.content.subtitle" class="md-text-link-card__subtitle">{{ card.content.subtitle }}</span>
        <p class="md-text-link-card__title">{{ card.content.title }}</p>
        <p v-if="card.content.description" class="md-text-link-card__description">{{ card.content.description }}</p>
        <div v-if="card.content.status || card.content.fields?.length" class="md-text-link-card__meta">
          <QuireTag v-if="card.content.status" size="xs" :color="card.content.status.tone ?? 'neutral'">{{ card.content.status.label }}</QuireTag>
          <span v-for="field in card.content.fields ?? []" :key="field.label">{{ field.label }} {{ field.value }}</span>
        </div>
        <a v-if="card.url" class="md-text-link-card__open" :href="card.url" target="_blank" rel="noopener noreferrer" @click="close">{{ mdEditorMessages[locale].openTextLink }}</a>
      </div>
    </QuirePopoverContent>
  </QuirePopoverRoot>
</template>

<style scoped>
.md-text-link-card__anchor { position: fixed; width: 1px; height: 1px; pointer-events: none; }
.md-text-link-card { display: grid; gap: 8px; min-width: 0; font-size: 12.5px; line-height: 1.5; }
.md-text-link-card__subtitle { color: var(--qk-color-text-tertiary); font-weight: 500; font-variant-numeric: tabular-nums; }
.md-text-link-card__title { margin: 0; color: var(--qk-color-text-primary); font-size: 14px; font-weight: 600; line-height: 1.45; overflow-wrap: anywhere; }
.md-text-link-card__description { display: -webkit-box; margin: 0; overflow: hidden; color: var(--qk-color-text-secondary); -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow-wrap: anywhere; }
.md-text-link-card__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: var(--qk-color-text-tertiary); }
.md-text-link-card__open { justify-self: start; color: var(--qk-color-text-secondary); }
.md-text-link-card__open:hover { color: var(--qk-color-text-primary); text-decoration: underline; text-underline-offset: 3px; }
</style>
