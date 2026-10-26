<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, ref, watch } from "vue";
import type { Editor } from "@quirekit/core";
import { EditorUIAnchoredOverlay } from "@quirekit/editor-ui/vue";
import { normalizeLinkHref } from "@quirekit/extension-link";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import { QuireCard, QuireToolbar } from "@quirekit/ui/vue";
import { followBlockLink } from "../../sections/links";
import { applyBlockLink, removeBlockLink } from "../../links/commands";
import { useBlockLinkContext } from "./context";
import { useBlockLinkScope } from "./state";
import LinkForm from "./form.vue";
import { inlineWebMetadata } from "../../web-card/metadata";
import { webLinkViewMenu, requestedWebLinkView } from "../web-card/menu";

const { t, localize } = useBlockLocale();

const props = defineProps<{
  /** Canonical document session. */ editor: Editor;
  /** Mounted document content host. */ root: HTMLElement;
  /** Live product permission, including changes without a document transaction. */ editable: boolean;
}>();
const surface = ref<HTMLElement>();
const { target, editing, anchor, measure, close } = useBlockLinkContext(props.editor, props.root, surface);
const feedback = ref(""), error = ref(""), copying = ref(false);
const items = computed<QuireKitToolbarEntry[]>(() => [
  { value: "address", label: target.value?.range?.href ?? "打开链接", attributes: { "data-block-link-address": "" } },
  { value: "address-separator", label: "", kind: "separator" },
  ...(target.value?.range && inlineWebMetadata(target.value) && props.editor.state.schema.nodes.webCard ? [webLinkViewMenu(
    target.value.text === target.value.range.href ? "link" : "title",
    view => !!target.value && props.editable && props.editor.can().setBlockLinkView(target.value, view), surface.value
  )] : []),
  { value: "open", label: "打开链接", icon: "externalLink" },
  { value: "edit", label: "编辑链接", icon: "edit", disabled: !props.editable },
  { value: "copy", label: "复制链接", icon: "copy", disabled: copying.value },
  { value: "remove", label: "取消链接", icon: "linkOff", disabled: !props.editable }
]);
watch(target, () => { feedback.value = ""; error.value = ""; copying.value = false; });
watch(() => props.editable, () => close());

/** @param href - Draft address. @param text - Draft display text. */
function apply(href: string, text: string): void {
  if (target.value && applyBlockLink(props.editor, target.value, href, text)) close(true);
  else error.value = "请输入有效的链接地址和单行文本";
}
/** Removes only the link mark through an independently undoable canonical command. */
function remove(): void {
  if (target.value && removeBlockLink(props.editor, target.value)) close(true);
  else error.value = "链接已发生变化，请重新选择";
}
/** Opens a validated destination only after the user's explicit action. */
function openLink(): void {
  const href = normalizeLinkHref(target.value?.range?.href);
  if (!href) return;
  if (followBlockLink(props.editor, href)) { close(); return; }
  try { props.root.ownerDocument.defaultView?.open(href, "_blank", "noopener,noreferrer"); }
  catch { feedback.value = "无法打开链接，请复制地址后重试"; }
}
/** Copies the captured address without letting an old async result overwrite a later task. */
async function copy(): Promise<void> {
  const source = target.value;
  if (!source?.range || copying.value) return;
  copying.value = true;
  try {
    await props.root.ownerDocument.defaultView!.navigator.clipboard.writeText(source.range.href);
    if (target.value === source) feedback.value = "链接已复制";
  } catch { if (target.value === source) feedback.value = "复制失败，请重试"; }
  finally { if (target.value === source) copying.value = false; }
}
/** @param action - Shared public toolbar intent. */
function execute(action: string): void {
  const view = requestedWebLinkView(action), source = target.value;
  if (view && source) {
    if (props.editor.commands.setBlockLinkView(source, view)) {
      if (view === "link" || view === "title") useBlockLinkScope(props.editor).open(false);
      else close(true);
    }
    return;
  }
  if (action === "open" || action === "address") openLink();
  else if (action === "edit" && props.editable) editing.value = true;
  else if (action === "copy") void copy();
  else if (action === "remove") remove();
}
</script>
<template>
  <EditorUIAnchoredOverlay :show="!!target" :anchor="anchor" :resolve-anchor="measure" placement="bottom">
    <div ref="surface" data-block-link-context class="qk-block-link-context">
      <!-- Menu portals remain siblings of this stable content boundary during form transitions. -->
      <div>
        <QuireCard v-if="target && editing" class="qk-block-link-context__surface" variant="raised" density="compact" role="dialog" :aria-label="t(target.range ? t('编辑链接') : t('插入链接'))">
          <LinkForm :target="target" :error="t(error)" @apply="apply" @cancel="close(true)" @remove="remove" />
        </QuireCard>
        <div v-else-if="target">
          <QuireToolbar :items="localize(items)" class="qk-block-link-context__toolbar" :label="t('链接快捷操作')" variant="elevated" align="start" overflow="visible" preserve-focus @execute="execute($event.value)" />
          <p v-if="feedback" class="qk-block-link-context__feedback" role="status">{{ t(feedback) }}</p>
        </div>
      </div>
    </div>
  </EditorUIAnchoredOverlay>
</template>
