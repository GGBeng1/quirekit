/** A semantic document container, independent of the editor or Markdown parser. */
export interface QuireKitProseContainerProps {
  /** Plain document title; editable adapters retain it in their source. */
  readonly title: string;
  /** Shared semantic surface and full outline. */
  readonly tone?: "neutral" | "info" | "success" | "warning" | "danger";
  /** Enable a keyboard-accessible disclosure control. */
  readonly collapsible?: boolean;
}
