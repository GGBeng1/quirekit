<script setup lang="ts">
import { computed, nextTick, shallowRef, watch } from "vue";
import type { MsfeEditor, MsfeTarget } from "@quirekit/msfe-core";
import { openLinkDestination } from "@quirekit/msfe-link";
import { QuirePopoverAnchor, QuirePopoverContent, QuirePopoverRoot, QuireToolbar } from "@quirekit/ui/vue";
import type { QuireKitToolbarEntry, QuireKitToolbarExecuteEvent } from "@quirekit/ui";
import { removeMdLink } from "../../commands/destination";
import { useMdOverlayTarget } from "../overlays/context";
import { mdEditorMessages } from "../messages";
import type { MdEditorLocale } from "../types";
import { useMdLinkContext } from "./context";

const props = defineProps<{
  /** Source owner and navigation policy. */ editor: MsfeEditor;
  /** Whether no other task owns the editor. */ enabled: boolean;
  /** Accessible control language. */ locale: MdEditorLocale;
  /** Uses public touch-sized controls on narrow screens. */ narrow: boolean;
}>();
const emit = defineEmits<{
  /** Owns ordinary-link hover suppression. */ "update:open": [open: boolean];
  /** A validated occurrence handed to the shared settings task. */ edit: [target: MsfeTarget];
}>();
const portal = useMdOverlayTarget(), text = computed(() => mdEditorMessages[props.locale]);
const { current, close } = useMdLinkContext(() => props.editor, () => props.enabled);
const feedback = shallowRef(""), copying = shallowRef(false);
watch(current, value => { feedback.value = ""; copying.value = false; emit("update:open", !!value); }, { flush: "sync" });
const entries = computed<QuireKitToolbarEntry[]>(() => {
  // Permission changes close the card; reopening must read the new editor state.
  void current.value;
  return [
    { value: "open", icon: "externalLink", label: text.value.openTextLink },
    { value: "edit", icon: "edit", label: text.value.editLink, disabled: props.editor.state.readOnly },
    { value: "copy", icon: "copy", label: text.value.copyLink, disabled: copying.value },
    { value: "remove", icon: "linkOff", label: text.value.removeLink, disabled: props.editor.state.readOnly },
  ];
});

/** Opens the original address using the same policy as modified clicks in the editor. */
function open(): void {
  if (!current.value?.anchor.target()) { close(); return; }
  try {
    if (openLinkDestination(props.editor.state, props.editor.element.ownerDocument, current.value.url)) close();
    else feedback.value = text.value.openLinkFailed;
  } catch { feedback.value = text.value.openLinkFailed; }
}
/** Copies the address and reports failures without changing document or selection. */
async function copy(): Promise<void> {
  const source = current.value;
  if (!source?.anchor.target() || copying.value) return;
  copying.value = true;
  try {
    const clipboard = props.editor.element.ownerDocument.defaultView?.navigator.clipboard;
    if (!clipboard) throw new Error("Clipboard unavailable");
    await clipboard.writeText(source.url);
    if (current.value === source) feedback.value = text.value.linkCopied;
  } catch { if (current.value === source) feedback.value = text.value.copyLinkFailed; }
  finally { if (current.value === source) copying.value = false; }
}
/** @param event - Public toolbar action targeting the captured occurrence. */
async function execute(event: QuireKitToolbarExecuteEvent): Promise<void> {
  if (event.value === "open") { open(); return; }
  if (event.value === "copy") { await copy(); return; }
  const target = current.value?.anchor.target();
  if (!target || props.editor.state.readOnly) { close(); return; }
  if (event.value === "edit") {
    // Dispose the old portal before the new modal observes focus and outside interactions.
    close(); await nextTick(); emit("edit", target);
  } else if (event.value === "remove") {
    if (props.editor.run(removeMdLink(), target).ok) { close(); await nextTick(); props.editor.focus(); }
    else feedback.value = text.value.rejected;
  }
}
</script>

<template>
  <QuirePopoverRoot :open="!!current" placement="bottom-start" :auto-focus="false" :restore-focus="false"
    @update:open="value => { if (!value) close(); }" @escape-key-down="editor.focus()">
    <QuirePopoverAnchor><span class="md-link-context__anchor" :style="current?.position" /></QuirePopoverAnchor>
    <QuirePopoverContent v-if="current" :portal-target="portal ?? 'body'" padding="none"
      width="min(400px, calc(100vw - 32px))" data-md-link-context :aria-label="text.link">
      <div class="md-link-context">
        <button type="button" class="md-link-context__url" :title="current.url" :aria-label="`${text.openTextLink}: ${current.url}`"
          @pointerdown.prevent @click="open">{{ current.url }}</button>
        <QuireToolbar class="md-link-context__actions" :items="entries" :label="text.link" variant="plain" :mode="narrow ? 'mobile' : 'desktop'"
          overflow="visible" align="start" preserve-focus @execute="execute" />
      </div>
      <p v-if="feedback" role="status" class="md-link-context__feedback">{{ feedback }}</p>
    </QuirePopoverContent>
  </QuirePopoverRoot>
</template>

<style scoped>
.md-link-context__anchor { position: fixed; width: 1px; height: 1px; pointer-events: none; }
.md-link-context { display: flex; align-items: center; gap: var(--qk-space-inline); padding: calc(var(--qk-space-inline) / 2); min-width: 0; }
.md-link-context__url { flex: 1; min-width: 0; margin-inline-start: var(--qk-space-inline); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  border: 0; padding: var(--qk-space-inline) 0; background: transparent; color: var(--qk-color-text-primary); font: inherit; font-size: var(--qk-type-helper-font-size); text-align: start; cursor: pointer; }
.md-link-context__url:hover { text-decoration: underline; }
.md-link-context__url:focus-visible { outline: 2px solid var(--qk-color-action-primary); outline-offset: 2px; }
.md-link-context__actions { flex: none; width: max-content; }
.md-link-context__feedback { margin: 0; padding: 0 var(--qk-space-group) var(--qk-space-inline); color: var(--qk-color-text-secondary); font-size: var(--qk-type-helper-font-size); }
</style>
