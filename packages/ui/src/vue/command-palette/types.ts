import type { QuireKitControlSize, QuireKitListDensity } from '../../components/control';
/** One host-owned command; selection never implies successful execution. */
export interface QuireKitCommandPaletteItem {
  /** Globally unique stable identity. */
  key: string;
  /** Readable command name. */
  label: string;
  /** Supporting explanation, never truncated by default. */
  description?: string | undefined;
  /** Additional terms searched without displaying them. */
  keywords?: readonly string[] | undefined;
  /** Prevents activation while preserving discoverability. */
  disabled?: boolean | undefined;
  /** Readable explanation for unavailable commands. */
  disabledReason?: string | undefined;
  /** Display-only shortcut keys; the host registers shortcuts. */
  keys?: readonly string[] | undefined;
}
/** Named commands kept in stable host order. */
export interface QuireKitCommandPaletteGroup {
  /** Stable group identity. */
  key: string;
  /** Accessible and visible group heading. */
  label: string;
  /** Ordered commands, including unavailable entries. */
  items: readonly QuireKitCommandPaletteItem[];
}
/** Inline search and command activation contract. */
export interface QuireKitCommandPaletteProps {
  /** Accessible input name. */
  label: string;
  /** Host-provided command groups. */
  groups: readonly QuireKitCommandPaletteGroup[];
  /** Controlled query text, preserved after selection. */
  search?: string | undefined;
  /** Initial uncontrolled query. */
  defaultSearch?: string | undefined;
  /** Shared input size; result rows have independent density. */
  size?: QuireKitControlSize | undefined;
  /** Result density, default regular; does not resize the input. */
  density?: QuireKitListDensity | undefined;
  /** Host-specific input hint; defaults to the language pack. */
  placeholder?: string | undefined;
  /** Local token matching, or host-filtered results. */
  filter?: 'local' | 'none' | undefined;
  /** Pending results; stale commands cannot activate. */
  loading?: boolean | undefined;
  /** Pending execution; leaves search and cancellation available. */
  busy?: boolean | undefined;
  /** Disables the complete search task. */
  disabled?: boolean | undefined;
  /** Host request failure; replaces results until recovered. */
  errorText?: string | undefined;
  /** Automatically focuses the input when mounted. */
  autoFocus?: boolean | undefined;
}
/** Static content supplied inside a result. */
export interface CommandPaletteItemSlotProps {
  /** Original host command. */
  item: QuireKitCommandPaletteItem;
}
/** Layout extensions; result slots must not contain interactive controls. */
export interface CommandPaletteSlots {
  /** Static leading icon or avatar. */
  leading?: (props: CommandPaletteItemSlotProps) => unknown | undefined;
  /** Static shortcut or supporting badge. */
  trailing?: (props: CommandPaletteItemSlotProps) => unknown | undefined;
  /** Optional explanatory footer or host controls outside the result list. */
  footer?: () => unknown | undefined;
}
/** Search task composed with the existing modal Dialog. */
export interface QuireKitCommandPaletteDialogProps extends QuireKitCommandPaletteProps {
  /** Visible Dialog title. */
  title: string;
  /** Controlled modal visibility. */
  open?: boolean | undefined;
  /** Initial uncontrolled modal visibility. */
  defaultOpen?: boolean | undefined;
  /** Optional Dialog explanation. */
  description?: string | undefined;
  /** Explicit destination after closing; defaults to the opener. */
  finalFocusEl?: (() => HTMLElement | null) | undefined;
}
/** Modal content extends the inline slots with an existing Button trigger. */
export interface CommandPaletteDialogSlots extends CommandPaletteSlots {
  /** Single existing Button receiving Ark trigger behavior. */
  trigger?: () => unknown | undefined;
}
