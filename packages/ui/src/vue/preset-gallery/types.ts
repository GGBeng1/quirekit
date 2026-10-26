import type { QuireKitPresetGalleryItem, QuireKitPresetGalleryItemSlotProps } from '../../components/preset-gallery';

/** Independent-action cards keep interactive content outside the selection target. */
export interface PresetActionCardsProps {
  /** Accessible group heading. */ readonly label: string;
  /** Retain the accessible heading without visible text. */ readonly hideLabel: boolean;
  /** Stable visible choices. */ readonly items: readonly QuireKitPresetGalleryItem[];
  /** Current preview selection. */ readonly value: string | null;
  /** Current keyboard candidate, separate from selection. */ readonly highlighted?: string | null;
  /** Prevent selection while preserving content. */ readonly disabled: boolean;
  /** Measured CSS columns for vertical navigation. */ readonly columns: number;
}

/** The same item state is available to decorative previews and independent actions. */
export interface PresetActionCardsSlots {
  /** Noninteractive illustration. */ readonly preview?: (props: QuireKitPresetGalleryItemSlotProps) => unknown;
  /** Independent controls beside the selection target; supply their own accessible labels. */ readonly actions?: (props: QuireKitPresetGalleryItemSlotProps) => unknown;
  /** Empty-state content. */ readonly empty?: () => unknown;
}
