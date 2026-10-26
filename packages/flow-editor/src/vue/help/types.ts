/** One supported keyboard chord or pointer gesture, displayed without registering input. */
export interface FlowShortcut {
  /** User-facing action within its section's focus scope. */ readonly label: string;
  /** Alternative chords; each inner array is one simultaneous key combination. */ readonly keys?: readonly (readonly string[])[];
  /** Pointer interaction when the action does not use a keyboard chord. */ readonly gesture?: string;
}

/** Related operations sharing the same input owner. */
export interface FlowShortcutGroup {
  /** Localized scope heading. */ readonly title: string;
  /** Actual supported operations in reading order. */ readonly items: readonly FlowShortcut[];
}
