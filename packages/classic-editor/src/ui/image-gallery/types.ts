import type { QuireKitImagePreviewLabels } from "@quirekit/ui/vue";
import type { VNodeChild } from "vue";

/** Resolution state rendered for one image-gallery entry. */
export type ClassicEditorImageGalleryItemStatus =
  | "loading"
  | "ready"
  | "failed";

/** Presentation-ready image consumed by the public gallery component. */
export interface ClassicEditorImageGalleryItem {
  /** Stable identity used by Vue rendering and consumer state mapping. */
  readonly id: string;
  /** Current resolver or loading state. */
  readonly status: ClassicEditorImageGalleryItemStatus;
  /** Browser-readable image URL when the item is ready. */
  readonly url: string | null;
  /** Accessible alternative text applied to the preview image. */
  readonly altText: string;
  /** Human-readable item name shown in the gallery footer. */
  readonly label: string;
  /** Optional color behind transparent areas, for images drawn on a white page. */
  readonly background?: string | undefined;
}

/** Localized copy required by the public image-gallery controls. */
export interface ClassicEditorImageGalleryLabels
  extends Omit<QuireKitImagePreviewLabels, "position"> {
  /** Download-current-image action label. */
  readonly download: string;
}

/** Controlled inputs for the public Classic Editor image gallery. */
export interface ClassicEditorImageGalleryProps {
  /** Whether the consumer requests the gallery to be visible. */
  readonly show: boolean;
  /** Mounted Classic Editor root supplying theme and owner-document authority. */
  readonly themeRoot: HTMLElement;
  /** Language inherited by the body-portalled preview surface. */
  readonly lang: string;
  /** Presentation-ready items in consumer-defined navigation order. */
  readonly items: readonly ClassicEditorImageGalleryItem[];
  /** Controlled active item index. */
  readonly activeIndex: number;
  /** Consumer-localized position text for the controlled active item. */
  readonly positionLabel: string;
  /** Localized labels for every built-in control and state. */
  readonly labels: ClassicEditorImageGalleryLabels;
  /** Diagnostic overlay family used by the shared overlay coordinator. */
  readonly overlayFamily?: string | undefined;
}

/** Context passed to optional image-gallery extension content. */
export interface ClassicEditorImageGalleryActionSlotContext {
  /** Current presentation-ready item, or null for an empty gallery. */
  readonly item: ClassicEditorImageGalleryItem | null;
  /** Controlled active item index. */
  readonly activeIndex: number;
}

/** Typed slots accepted by the public Classic Editor image gallery. */
export interface ClassicEditorImageGallerySlots {
  /** Optional consumer controls appended after built-in preview controls. */
  readonly actions?: (
    context: ClassicEditorImageGalleryActionSlotContext
  ) => VNodeChild;
}
