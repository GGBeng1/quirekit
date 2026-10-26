import { quireKitEditorIconData } from "../../../components/icon/catalog";

/** Physical left arrow; The owner itself resolves logical direction exactly once. */
export const scrollLeftIcon = Object.freeze({ ...quireKitEditorIconData.chevronLeft, mirrorInRtl: false });

/** Physical right arrow; structural controls remain visible without an IconProvider. */
export const scrollRightIcon = Object.freeze({ ...quireKitEditorIconData.chevronRight, mirrorInRtl: false });
