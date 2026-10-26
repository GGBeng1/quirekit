import { defineComponent, h, shallowRef, onMounted, onUnmounted, type ShallowRef, type PropType } from "vue";
import { createMsfeEditor, createComponentHost, type MsfeEditor } from "@quirekit/msfe-core";
import { VueNodeViewHost } from "./host";
import type { VueEditorOptions } from "./types";

/**
 * Mounts once after the DOM exists; the caller renders VueNodeViewHost under its providers.
 * @param parent - Vue-owned mount ref. @param options - Initial configuration factory.
 * @returns Shallow editor ref and per-editor component host; no reactive Markdown mirror.
 */
export function useMsfeEditor(parent: ShallowRef<HTMLElement | null>, options: () => VueEditorOptions) {
  const editor = shallowRef<MsfeEditor>();
  const host = createComponentHost("vue");
  onMounted(() => {
    if (!parent.value) return;
    const initial = options();
    try { editor.value = createMsfeEditor({ ...initial, parent: parent.value, componentHost: host }); }
    catch (error) {
      // Failed creation has no published instance; release portals before reporting to the host.
      host.destroy();
      if (!initial.onError) throw error;
      initial.onError(error);
    }
  });
  // Destroy after child Teleports unmount, so the host never re-renders mid-unmount and their targets still exist.
  onUnmounted(() => { editor.value?.destroy(); host.destroy(); });
  return { editor, host };
}

/** Complete Vue consumer boundary; options are initial settings, not a per-render reset signal. */
export const MsfeEditorContent = defineComponent({ name: "MsfeEditorContent", inheritAttrs: false,
  props: { options: { type: Object as PropType<VueEditorOptions>, required: true } },
  emits: { ready: (_editor: MsfeEditor) => true },
  setup(props, { attrs, expose, emit }) {
    const parent = shallowRef<HTMLElement | null>(null);
    const session = useMsfeEditor(parent, () => props.options);
    onMounted(() => { if (session.editor.value) emit("ready", session.editor.value); });
    expose({ editor: session.editor });
    return () => [h("div", { ...attrs, ref: parent }), h(VueNodeViewHost, { host: session.host })];
  },
});
