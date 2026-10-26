import type {
  DefineSetupFnComponent,
  SlotsType
} from "vue";
import PopupMenu from "./popup-menu.vue";
import PopupMenuItem from "./popup-menu-item.vue";
import type {
  ClassicEditorPopupMenuItemProps,
  ClassicEditorPopupMenuProps,
  ClassicEditorPopupMenuSlots
} from "./types";

type ClassicEditorPopupMenuEmits = {
  "update:show": (show: boolean) => void;
};

type ClassicEditorPopupMenuItemEmits = {
  click: (event: MouseEvent) => void;
  select: (key: string) => void;
};

/** Public Popup Menu component with a stable TypeScript declaration boundary. */
export const ClassicEditorPopupMenu = PopupMenu as unknown as DefineSetupFnComponent<
  ClassicEditorPopupMenuProps,
  ClassicEditorPopupMenuEmits,
  SlotsType<ClassicEditorPopupMenuSlots>
>;

/** Public Popup Menu icon action with a stable TypeScript declaration boundary. */
export const ClassicEditorPopupMenuItem = PopupMenuItem as unknown as DefineSetupFnComponent<
  ClassicEditorPopupMenuItemProps,
  ClassicEditorPopupMenuItemEmits
>;
