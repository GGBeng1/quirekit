import { computed, shallowRef, watch } from 'vue';
import { defaultExportTemplateReference, readExportTemplate, type ExportTemplateReference } from '@quirekit/export-template';
import type { MdExportTemplateSelectionProps } from './types';

/** @param props - Reactive host props. @param changed - Controlled selection notification.
 * @returns Instance-local selection, metadata and explicit commit/reset actions without source subscriptions. */
export function useExportTemplateSelection(props: MdExportTemplateSelectionProps, changed: (reference: ExportTemplateReference) => void) {
  const local = shallowRef(defaultExportTemplateReference), name = shallowRef('');
  const selected = computed(() => props.exportStyle ?? local.value);
  watch([() => props.templates, () => selected.value.id, () => selected.value.revision, () => props.locale], async (_, _old, cleanup) => {
    const operation = new AbortController(); cleanup(() => operation.abort());
    const english = props.locale === 'en';
    name.value = selected.value.id === defaultExportTemplateReference.id ? english ? 'Default' : '默认' : english ? 'Loading…' : '正在读取…';
    if (!props.templates) return;
    try {
      const definition = await readExportTemplate(props.templates, selected.value, operation.signal);
      if (!operation.signal.aborted) name.value = definition.id === defaultExportTemplateReference.id ? english ? 'Default' : '默认' : definition.name;
    } catch { if (!operation.signal.aborted) name.value = english ? 'Template unavailable' : '模板不可用'; }
  }, { immediate: true });
  return { selected, name,
    /** @param reference - Explicit picker result. */
    choose(reference: ExportTemplateReference): void { local.value = Object.freeze({ ...reference }); changed(local.value); },
    /** Reset uncontrolled selection when the document lifetime changes. */
    reset(): void { local.value = defaultExportTemplateReference; },
  };
}
