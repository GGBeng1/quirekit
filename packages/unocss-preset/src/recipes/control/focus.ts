/**
 * A single 1px inset contour (the default border width) identifies the entire compound field without changing
 * its border-box or adding a second ring around internal buttons.
 */
export const controlFocusWithin = "focus-within:outline-solid focus-within:outline-width-qk-default focus-within:outline-qk-border-focus focus-within:outline-offset-[calc(-1*var(--qk-border-width-default))]";

/** Keeps validation and keyboard focus visible together on an invalid field. */
export const invalidControlFocusWithin = "focus-within:!outline-qk-danger-text";
