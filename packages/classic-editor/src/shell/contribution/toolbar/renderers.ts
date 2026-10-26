import { defineComponent, h, type PropType } from "vue";
import type { QuireKitToolbarRendererScope, QuireKitToolbarRenderers } from "@quirekit/ui/vue";
import RibbonWidget from "../../components/classic-editor-ribbon-widget.vue";
import type { ClassicToolbarContext, ClassicToolbarEntryMeta } from "./types";

/**
 * Renders an individual feature control or body with its original local scope.
 * @param body - Whether to select the entry's content renderer instead of its control renderer.
 * @returns Stable component shared by every configured feature entry.
 */
function createFeatureRenderer(body: boolean) {
  return defineComponent({
    props: { scope: { type: Object as PropType<QuireKitToolbarRendererScope>, required: true } },
    setup: props => () => {
      const meta = props.scope.item.meta as ClassicToolbarEntryMeta | undefined;
      if (meta?.kind !== "feature") return null;
      const adapter = props.scope.context as ClassicToolbarContext;
      const feature = adapter.features.get(meta.featureKey);
      const name = body ? meta.original.contentRenderer : meta.original.renderer;
      const component = name === undefined ? undefined : feature?.configuration.renderers?.[name];
      if (!component) return null;
      return h(component, { scope: {
        ...props.scope, item: { ...meta.original,
          ...(props.scope.item.attributes ? { attributes: props.scope.item.attributes } : {}),
          ...(props.scope.item.overlayProps ? { overlayProps: props.scope.item.overlayProps } : {})
        }, path: meta.path, context: feature?.configuration.context
      } satisfies QuireKitToolbarRendererScope });
    }
  });
}

const LegacyWidget = defineComponent({
  props: { scope: { type: Object as PropType<QuireKitToolbarRendererScope>, required: true } },
  setup: props => () => {
    const meta = props.scope.item.meta as ClassicToolbarEntryMeta | undefined;
    const context = (props.scope.context as ClassicToolbarContext).model.context;
    return meta?.kind === "widget" && context
      ? h(RibbonWidget, { contribution: meta.contribution, context }) : null;
  }
});

/** Shared public renderers retain only feature bodies and the external widget compatibility contract. */
export const classicToolbarRenderers: QuireKitToolbarRenderers = Object.freeze({
  "classic-feature-control": createFeatureRenderer(false),
  "classic-feature-content": createFeatureRenderer(true),
  "classic-widget": LegacyWidget
});
