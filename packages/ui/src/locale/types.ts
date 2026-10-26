import type { Messages as HtmlSandboxMessages } from "./components/html-sandbox";
import type { Messages as MediaPlayerMessages } from "./components/media-player";
import type { Messages as CalendarMessages } from "./components/calendar";
import type { Messages as DateInputMessages } from "./components/date-input";
import type { Messages as DatePickerMessages } from "./components/date-picker";
import type { Messages as DateRangePickerMessages } from "./components/date-range-picker";
import type { Messages as DateTimePickerMessages } from "./components/date-time-picker";
import type { Messages as DateTimeRangePickerMessages } from "./components/date-time-range-picker";
import type { Messages as TimeInputMessages } from "./components/time-input";
import type { Messages as TimePickerMessages } from "./components/time-picker";
import type { Messages as TimeRangePickerMessages } from "./components/time-range-picker";
import type { Messages as PickerMessages } from "./components/picker";
import type { Messages as ChatMessages } from "./components/chat";
import type { Messages as SourcesMessages } from "./components/sources";
import type { Messages as AttachmentMessages } from "./components/attachment";
import type { Messages as TerminalOutputMessages } from "./components/terminal-output";
import type { Messages as ColorPickerMessages } from "./components/color-picker";
import type { Messages as ImageMessages } from "./components/image";
import type { Messages as ImageCropperMessages } from "./components/image-cropper";
import type { Messages as ImagePreviewMessages } from "./components/image-preview";
import type { Messages as QrCodeMessages } from "./components/qr-code";
import type { Messages as AvatarMessages } from "./components/avatar";
import type { Messages as CommentMessages } from "./components/comment";
import type { Messages as CarouselMessages } from "./components/carousel";
import type { Messages as EmojiPickerMessages } from "./components/emoji-picker";
import type { Messages as CodeBlockMessages } from "./components/code-block";
import type { Messages as DiffViewerMessages } from "./components/diff-viewer";
import type { Messages as TableMessages } from "./components/table";
import type { Messages as PaginationMessages } from "./components/pagination";
import type { Messages as TransferMessages } from "./components/transfer";
import type { Messages as TreeSelectMessages } from "./components/tree-select";
import type { Messages as CascaderMessages } from "./components/cascader";
import type { Messages as HierarchyPickerMessages } from "./components/hierarchy-picker";
import type { Messages as ListboxMessages } from "./components/listbox";
import type { Messages as SelectMessages } from "./components/select";
import type { Messages as ComboboxMessages } from "./components/combobox";
import type { Messages as InputMessages } from "./components/input";
import type { Messages as InputNumberMessages } from "./components/input-number";
import type { Messages as TagsInputMessages } from "./components/tags-input";
import type { Messages as PinInputMessages } from "./components/pin-input";
import type { Messages as RatingMessages } from "./components/rating";
import type { Messages as EditableMessages } from "./components/editable";
import type { Messages as FieldMessages } from "./components/field";
import type { Messages as FieldsetMessages } from "./components/fieldset";
import type { Messages as FormMessages } from "./components/form";
import type { Messages as FormFieldMessages } from "./components/form-field";
import type { Messages as InspectorMessages } from "./components/inspector";
import type { Messages as ClipboardMessages } from "./components/clipboard";
import type { Messages as ActionMenuMessages } from "./components/action-menu";
import type { Messages as ActionSheetMessages } from "./components/action-sheet";
import type { Messages as AlertMessages } from "./components/alert";
import type { Messages as AnchorMessages } from "./components/anchor";
import type { Messages as BadgeMessages } from "./components/badge";
import type { Messages as BreadcrumbMessages } from "./components/breadcrumb";
import type { Messages as DialogMessages } from "./components/dialog";
import type { Messages as DrawerMessages } from "./components/drawer";
import type { Messages as PopconfirmMessages } from "./components/popconfirm";
import type { Messages as PopoverMessages } from "./components/popover";
import type { Messages as ToastMessages } from "./components/toast";
import type { Messages as NavigationMenuMessages } from "./components/navigation-menu";
import type { Messages as CommandPaletteMessages } from "./components/command-palette";
import type { Messages as StepsMessages } from "./components/steps";
import type { Messages as TimelineMessages } from "./components/timeline";
import type { Messages as TagMessages } from "./components/tag";
import type { Messages as ToolbarMessages } from "./components/toolbar";
import type { Messages as SplitterMessages } from "./components/splitter";
import type { Messages as StatisticMessages } from "./components/statistic";
import type { Messages as ProgressMessages } from "./components/progress";
import type { Messages as PresetGalleryMessages } from "./components/preset-gallery";
import type { Messages as PresetPickerMessages } from "./components/preset-picker";
import type { Messages as ChoicePickerMessages } from "./components/choice-picker";
import type { Messages as ProseMessages } from "./components/prose";
import type { Messages as SelectionHandlesMessages } from "./components/selection-handles";
import type { Messages as IconCatalogMessages } from "./components/icon-catalog";
import type { Messages as FileUploadMessages } from "./components/file-upload";
import type { Messages as JsonViewerMessages } from "./components/json-viewer";
/** Interface text of every localized component, keyed by component. */
export interface QuireKitMessages {
  /** Audio and video playback. */ readonly mediaPlayer: MediaPlayerMessages;
  /** HTML execution preview. */ readonly htmlSandbox: HtmlSandboxMessages;
  /** Calendar. */
  readonly calendar: CalendarMessages;
  /** DateInput. */
  readonly dateInput: DateInputMessages;
  /** DatePicker. */
  readonly datePicker: DatePickerMessages;
  /** DateRangePicker. */
  readonly dateRangePicker: DateRangePickerMessages;
  /** DateTimePicker. */
  readonly dateTimePicker: DateTimePickerMessages;
  /** DateTimeRangePicker. */
  readonly dateTimeRangePicker: DateTimeRangePickerMessages;
  /** TimeInput. */
  readonly timeInput: TimeInputMessages;
  /** TimePicker. */
  readonly timePicker: TimePickerMessages;
  /** TimeRangePicker. */
  readonly timeRangePicker: TimeRangePickerMessages;
  /** Picker. */
  readonly picker: PickerMessages;
  /** Chat. */
  readonly chat: ChatMessages;
  /** Sources. */
  readonly sources: SourcesMessages;
  /** Attachment. */
  readonly attachment: AttachmentMessages;
  /** TerminalOutput. */
  readonly terminalOutput: TerminalOutputMessages;
  /** ColorPicker. */
  readonly colorPicker: ColorPickerMessages;
  /** Image. */
  readonly image: ImageMessages;
  /** ImageCropper. */
  readonly imageCropper: ImageCropperMessages;
  /** ImagePreview. */
  readonly imagePreview: ImagePreviewMessages;
  /** QrCode. */
  readonly qrCode: QrCodeMessages;
  /** Avatar. */
  readonly avatar: AvatarMessages;
  /** CommentThread and CommentDraft. */
  readonly comment: CommentMessages;
  /** Carousel. */
  readonly carousel: CarouselMessages;
  /** EmojiPicker. */
  readonly emojiPicker: EmojiPickerMessages;
  /** CodeBlock. */
  readonly codeBlock: CodeBlockMessages;
  /** DiffViewer. */
  readonly diffViewer: DiffViewerMessages;
  /** Table. */
  readonly table: TableMessages;
  /** Pagination. */
  readonly pagination: PaginationMessages;
  /** Transfer. */
  readonly transfer: TransferMessages;
  /** TreeSelect. */
  readonly treeSelect: TreeSelectMessages;
  /** Cascader. */
  readonly cascader: CascaderMessages;
  /** HierarchyPicker. */
  readonly hierarchyPicker: HierarchyPickerMessages;
  /** Listbox. */
  readonly listbox: ListboxMessages;
  /** Select. */
  readonly select: SelectMessages;
  /** Combobox. */
  readonly combobox: ComboboxMessages;
  /** Input. */
  readonly input: InputMessages;
  /** InputNumber. */
  readonly inputNumber: InputNumberMessages;
  /** TagsInput. */
  readonly tagsInput: TagsInputMessages;
  /** PinInput. */
  readonly pinInput: PinInputMessages;
  /** Rating. */
  readonly rating: RatingMessages;
  /** Editable. */
  readonly editable: EditableMessages;
  /** Field. */
  readonly field: FieldMessages;
  /** Fieldset. */
  readonly fieldset: FieldsetMessages;
  /** Form. */
  readonly form: FormMessages;
  /** FormField. */
  readonly formField: FormFieldMessages;
  /** Inspector. */
  readonly inspector: InspectorMessages;
  /** Clipboard. */
  readonly clipboard: ClipboardMessages;
  /** ActionMenu. */
  readonly actionMenu: ActionMenuMessages;
  /** ActionSheet. */
  readonly actionSheet: ActionSheetMessages;
  /** Alert. */
  readonly alert: AlertMessages;
  /** Anchor. */
  readonly anchor: AnchorMessages;
  /** Badge. */
  readonly badge: BadgeMessages;
  /** Breadcrumb. */
  readonly breadcrumb: BreadcrumbMessages;
  /** Dialog. */
  readonly dialog: DialogMessages;
  /** Drawer. */
  readonly drawer: DrawerMessages;
  /** Popconfirm. */
  readonly popconfirm: PopconfirmMessages;
  /** Popover. */
  readonly popover: PopoverMessages;
  /** Toast. */
  readonly toast: ToastMessages;
  /** NavigationMenu. */
  readonly navigationMenu: NavigationMenuMessages;
  /** CommandPalette. */
  readonly commandPalette: CommandPaletteMessages;
  /** Steps. */
  readonly steps: StepsMessages;
  /** Timeline. */
  readonly timeline: TimelineMessages;
  /** Tag. */
  readonly tag: TagMessages;
  /** Toolbar. */
  readonly toolbar: ToolbarMessages;
  /** Splitter. */
  readonly splitter: SplitterMessages;
  /** Statistic. */
  readonly statistic: StatisticMessages;
  /** Progress. */
  readonly progress: ProgressMessages;
  /** PresetGallery. */
  readonly presetGallery: PresetGalleryMessages;
  /** PresetPicker. */
  readonly presetPicker: PresetPickerMessages;
  /** ChoicePicker. */
  readonly choicePicker: ChoicePickerMessages;
  /** Prose. */
  readonly prose: ProseMessages;
  /** SelectionHandles. */
  readonly selectionHandles: SelectionHandlesMessages;
  /** IconCatalog. */
  readonly iconCatalog: IconCatalogMessages;
  /** FileUpload. */
  readonly fileUpload: FileUploadMessages;
  /** JsonViewer. */
  readonly jsonViewer: JsonViewerMessages;
}

/** Component whose text a language pack provides. */
export type QuireKitMessageScope = keyof QuireKitMessages;

/** A complete built-in language. */
export interface QuireKitLocale {
  /** BCP 47 language tag, also used for date, number and size formatting. */
  readonly code: string;
  /** Text for every localized component. */
  readonly messages: QuireKitMessages;
}

/**
 * An added or adjusted language. Components or messages it omits come from `fallback`, so a
 * pack written for one release keeps working when later releases localize more components.
 */
export interface QuireKitLocalePack {
  /** BCP 47 language tag. */
  readonly code: string;
  /** Language supplying anything this pack omits; defaults to `en`. */
  readonly fallback?: string;
  /** Text by component; each component may be partial. */
  readonly messages: { readonly [Scope in QuireKitMessageScope]?: Partial<QuireKitMessages[Scope]> };
}
