import type { QuireKitTheme } from "../../theme/types";

/** Properties for an editor-independent, inheritable UI theme scope. */
export interface QuireKitThemeProviderProps {
  /** Complete immutable theme; replace this object to change the scope's theme. */
  readonly theme: QuireKitTheme;
  /** Whether this provider also creates a CSS-variable surface around its slot. */
  readonly surface?: boolean | undefined;
}
