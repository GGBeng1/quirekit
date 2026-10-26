import { createApp, h, shallowRef } from "vue";
import { QuireLocaleProvider } from "@quirekit/ui/vue";
import type { MdEditorPanel } from "../../panels/types";
import View from "./view.vue";
import { getMdVersions } from "../../activity/extension";
import { activityLabels } from "./labels";
import { locateActivity } from "./locate";
import { getMdCommentsBridge } from "../comments/bridge";
import type { MdActivityPanelOptions } from "./types";

/**
 * Creates the activity side panel for `MdEditor`'s `panels`. Recording is separate: install `MdActivity`
 * with the same store and document identity.
 * @param options - Host store, document and viewer.
 * @returns Panel definition.
 */
export function mdActivityPanel(options: MdActivityPanelOptions): MdEditorPanel {
  return { id: "activity", icon: "history", label: { "zh-CN": activityLabels["zh-CN"].title, en: activityLabels.en.title },
    ...(options.defaultOpen === undefined ? {} : { defaultOpen: options.defaultOpen }),
    mount(context) {
      const element = context.ownerDocument.createElement("div"), locale = shallowRef(context.locale);
      const app = createApp({ render: () => h(QuireLocaleProvider, { locale: locale.value }, () => h(View, {
        timeline: { store: options.store, documentId: options.documentId, locale: locale.value, viewer: options.viewer, local: options.local,
          locate: event => locateActivity(context.editor.state, event, options.resolveTarget, getMdCommentsBridge(context.editor)), reveal: context.reveal },
        versions: options.versions && { versions: options.versions, documentId: options.documentId, locale: locale.value,
          controller: () => getMdVersions(context.editor), source: () => context.editor.state.doc.toString() } })) });
      // 页面上可能同时有多个 Vue 应用，id 前缀避免组件按 id 查找时找到别的应用的元素。
      app.config.idPrefix = `qk-md-activity-${Array.from(globalThis.crypto.getRandomValues(new Uint32Array(2)), value => value.toString(36)).join("-")}`;
      app.mount(element);
      return { element, update(state) { locale.value = state.locale; }, destroy() { app.unmount(); element.remove(); } };
    },
  };
}
