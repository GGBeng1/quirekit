import { defineComponent, h, Teleport, shallowRef, watch, onBeforeUnmount, type Component, type PropType } from "vue";
import { componentRenderer, componentViewRenderer, type ComponentViewRenderer, type ComponentViewEntry,
  type MsfeComponentHost, type MsfeComponentEntry, type MsfeNodeViewRenderer } from "@quirekit/msfe-core";

/** @param component - Vue component accepting a nodeView prop. @returns Framework-neutral renderer. */
export function VueNodeViewRenderer(component: Component): MsfeNodeViewRenderer { return componentRenderer("vue", component); }

/** @param component - Vue component accepting a typed view prop. @returns Renderer using the existing Teleport host. */
export function VueComponentViewRenderer<Props extends object>(component: Component): ComponentViewRenderer<Props> { return componentViewRenderer("vue", component); }

/** Render inside existing providers; Teleport preserves logical Vue ancestry and injection. */
export const VueNodeViewHost = defineComponent({ name: "MsfeVueNodeViewHost",
  props: { host: { type: Object as PropType<MsfeComponentHost>, required: true } },
  setup(props) {
    const entries = shallowRef<readonly MsfeComponentEntry[]>([]);
    const views = shallowRef<readonly ComponentViewEntry[]>([]);
    let unsubscribe: (() => void) | undefined;
    watch(() => props.host, host => {
      unsubscribe?.();
      entries.value = host.getSnapshot();
      views.value = host.getViewSnapshot();
      unsubscribe = host.subscribe(() => { entries.value = host.getSnapshot(); views.value = host.getViewSnapshot(); });
    }, { immediate: true });
    onBeforeUnmount(() => unsubscribe?.());
    return () => [...entries.value.map(entry => h(Teleport, { to: entry.dom, key: entry.id },
      [h(entry.component as Component, { nodeView: entry.props })])),
      ...views.value.map(entry => h(Teleport, { to: entry.dom, key: entry.id }, [h(entry.component as Component, { view: entry.props })]))];
  },
});
