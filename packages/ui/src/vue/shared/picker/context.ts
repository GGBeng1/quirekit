import { computed, inject } from 'vue';
import type { InjectionKey } from 'vue';
import type { PickerSurfaceContext } from './types';
/** Private owner shared by the field, physical shell and draft editors. */
export const pickerSurfaceKey: InjectionKey<PickerSurfaceContext> = Symbol('picker-surface');
/** @returns The current physical presentation, or desktop for standalone editors. */
export function usePickerBottom() { return inject(pickerSurfaceKey)?.bottom ?? computed(() => false); }
