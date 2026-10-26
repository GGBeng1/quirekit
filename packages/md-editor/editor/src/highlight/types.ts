/** Named highlight palette; colors resolve to design tokens, never stored hex values. */
export type MdHighlightColor = "orange" | "red" | "green" | "blue" | "purple" | "gray";

/** Effective presentation of one `::: highlight` container. */
export interface MdHighlightAttributes {
  /** Icon shown before the body. */ readonly emoji: string;
  /** Block background. */ readonly color: MdHighlightColor;
  /** Body text color; undefined keeps the default text color. */ readonly text?: MdHighlightColor | undefined;
}

/** Source-neutral icon control mounted on a highlight's opening line. */
export interface MdHighlightIconProps {
  /** Opening fence position of the container this control was built for. */ readonly from: number;
  /** Current effective icon. */ readonly emoji: string;
  /** Localized accessible action. */ readonly label: string;
  /** Whether the host allows source changes. */ readonly editable: boolean;
  /** @param emoji - Replacement icon. @returns Whether the guarded source change was accepted. */
  readonly change: (emoji: string) => boolean;
}
