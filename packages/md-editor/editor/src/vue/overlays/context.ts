import { inject, provide, shallowReadonly, shallowRef, type InjectionKey, type ShallowRef } from "vue";

/** One physical overlay host per mounted Markdown editor. */
const overlayKey: InjectionKey<Readonly<ShallowRef<HTMLElement | undefined>>> = Symbol("md-overlay");

/** @returns The host ref owned by the editor shell; clearing it retires the physical surface. */
export function provideMdOverlayTarget(): ShallowRef<HTMLElement | undefined> {
  const target = shallowRef<HTMLElement>();
  provide(overlayKey, shallowReadonly(target));
  return target;
}

/** @returns The nearest editor's portal target, or an empty ref outside MdEditor. */
export function useMdOverlayTarget(): Readonly<ShallowRef<HTMLElement | undefined>> {
  return inject(overlayKey, shallowRef<HTMLElement>());
}

/** Rectangle local to the document layer, in CSS pixels. */
export interface MdLayerRect {
  /** Left edge from the layer origin. */ readonly left: number;
  /** Top edge from the layer origin. */ readonly top: number;
  /** Width. */ readonly width: number;
  /** Height. */ readonly height: number;
}

/** Editor-sized layer that scrolls with the document; surfaces inside it never reposition on scroll. */
const documentLayerKey: InjectionKey<Readonly<ShallowRef<HTMLElement | undefined>>> = Symbol("md-document-layer");

/** @returns The layer ref owned by the editor shell. */
export function provideMdDocumentLayer(): ShallowRef<HTMLElement | undefined> {
  const target = shallowRef<HTMLElement>();
  provide(documentLayerKey, shallowReadonly(target));
  return target;
}

/**
 * Projects viewport geometry into the document layer.
 * @param layer - Mounted document layer.
 * @param rect - Client rectangle measured in the same frame.
 * @returns Layer-local rectangle; unchanged while the document scrolls.
 */
export function projectMdLayerRect(layer: HTMLElement | undefined, rect: MdLayerRect): MdLayerRect {
  const origin = layer?.getBoundingClientRect();
  return origin ? { left: rect.left - origin.left, top: rect.top - origin.top, width: rect.width, height: rect.height } : rect;
}

/** @returns The nearest editor's document layer, or an empty ref outside MdEditor. */
export function useMdDocumentLayer(): Readonly<ShallowRef<HTMLElement | undefined>> {
  return inject(documentLayerKey, shallowRef<HTMLElement>());
}
