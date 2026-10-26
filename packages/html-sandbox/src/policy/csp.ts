/** Guest-only policy. Host and runner CSP remain additional restrictions. */
export const GUEST_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'";
/** Permissions excluded even when a containing application grants them. */
export const DENIED_FEATURES = "camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'; fullscreen 'none'; payment 'none'; usb 'none'; display-capture 'none'";
