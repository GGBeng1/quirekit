import { computed, onBeforeUnmount, shallowRef, watch } from 'vue';
import { createMathPresentation } from '@quirekit/math';
import type { MathDocument, MathPresentation, MathPresentationSnapshot } from '@quirekit/math';
import { acquireFormulaRenderer } from './renderer';
import type { FormulaPresentationOptions, FormulaRendererLease } from './types';

/**
 * Projects the public neutral presenter into Vue, acquiring a backend only for visible output.
 * @param document - Explicit source identity dependency.
 * @param options - Presentation and visibility dependencies.
 * @returns Retained graphic, readiness, errors and actual backend work.
 */
export function useFormulaLayout(document: () => MathDocument, options: FormulaPresentationOptions = {}) {
  const snapshot = shallowRef<MathPresentationSnapshot>({ ready: false, pending: false, layouts: 0 });
  let lease: FormulaRendererLease | undefined;
  let presentation: MathPresentation | undefined;
  const visible = options.visible ?? (() => true);
  watch(() => [document(), visible()] as const, ([current, shown]) => {
    if (!presentation && shown) {
      lease = acquireFormulaRenderer(options.editable === true);
      presentation = createMathPresentation({ renderer: lease.renderer, editable: options.editable === true });
      presentation.subscribe(value => { snapshot.value = value; });
    }
    presentation?.update(current, shown);
  }, { immediate: true });
  onBeforeUnmount(() => { presentation?.destroy(); lease?.release(); });
  return { layout: computed(() => snapshot.value.layout), ready: computed(() => snapshot.value.ready),
    pending: computed(() => snapshot.value.pending), error: computed(() => snapshot.value.error), layouts: computed(() => snapshot.value.layouts) };
}
