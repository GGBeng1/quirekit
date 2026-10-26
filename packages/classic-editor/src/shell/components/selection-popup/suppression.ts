/**
 * Transaction meta that keeps the selection popup closed for the selection it sets.
 *
 * Programmatic selections such as search navigation select text for review, not for
 * formatting, so the popup stays hidden until the user selects a different range.
 */
export const classicEditorSelectionPopupSuppressMeta = "classicEditor.suppressSelectionPopup";
