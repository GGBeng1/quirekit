import type {
  ClassicEditorBilingualText,
  ClassicEditorLocale
} from "@classic/types";

const messageDefinitions = {
  cancel: ["取消", "Cancel"],
  edit: ["编辑", "Edit"],
  undo: ["撤销", "Undo"],
  redo: ["重做", "Redo"],
  insert: ["插入", "Insert"],
  graphics: ["绘图", "Graphics"],
  importDocument: ["导入", "Import"],
  exportDocument: ["导出", "Export"],
  importingDocumentFormat: ["正在导入 {format}…", "Importing {format}…"],
  exportingDocumentFormat: ["正在导出 {format}…", "Exporting {format}…"],
  documentImported: ["已导入 {fileName}", "Imported {fileName}"],
  documentImportCompleted: ["导入完成", "Import completed"],
  documentExportCompleted: ["导出完成", "Export completed"],
  documentOperationDetails: ["查看详情", "View details"],
  documentDownloadStarted: [
    "已开始下载 {fileName}",
    "Download started: {fileName}"
  ],
  documentImportFailed: [
    "导入失败，当前文档未更改",
    "Import failed; current document unchanged"
  ],
  documentExportFailed: ["导出失败", "Export failed"],
  documentImportCompatibilityIssues: [
    "导入完成，但发现 {count} 个兼容性问题",
    "Import completed with {count} compatibility issue(s)"
  ],
  documentExportCompatibilityIssues: [
    "导出完成，但发现 {count} 个兼容性问题",
    "Export completed with {count} compatibility issue(s)"
  ],
  documentImportContentLoss: [
    "已导入，但有 {count} 处内容未能完整保留",
    "Imported, but {count} item(s) could not be kept intact"
  ],
  documentExportContentLoss: [
    "已导出，但有 {count} 处内容未能完整保留",
    "Exported, but {count} item(s) could not be kept intact"
  ],
  documentImportCompatibilityNotes: [
    "导入完成，并有 {count} 条兼容性说明",
    "Import completed with {count} compatibility note(s)"
  ],
  documentExportCompatibilityNotes: [
    "导出完成，并有 {count} 条兼容性说明",
    "Export completed with {count} compatibility note(s)"
  ],
  documentImportPreservedCompatibilityInformation: [
    "导入完成，已保留 {count} 项兼容信息，无内容丢失",
    "Import completed; preserved {count} compatibility item(s) with no content loss"
  ],
  documentExportPreservedCompatibilityInformation: [
    "导出完成，已保留 {count} 项兼容信息，无内容丢失",
    "Export completed; preserved {count} compatibility item(s) with no content loss"
  ],
  documentDiagnosticLastRenderedPageBreakPreserved: [
    "历史分页位置提示：已保留来源应用上次排版时记录的分页位置；它不会被当作作者设置的强制分页。",
    "Historical pagination hint: preserved the page position recorded by the source application without treating it as an authored page break."
  ],
  documentDiagnosticInlineContentControlPreserved: [
    "行内内容控件：已完整保留 Word 控件及其可编辑内容，内容仍由对应的原生功能处理。",
    "Inline content control: preserved the Word control and its editable content, which remains owned by the corresponding native feature."
  ],
  documentDiagnosticCodecFailed: [
    "这一处内容转换出错，已尽量保留其中的文字。",
    "This content failed to convert; its text was kept where possible."
  ],
  documentDiagnosticExportTextFallback: [
    "这一处内容已按纯文本导出，原有格式和结构未保留。",
    "This content was exported as plain text without its formatting or structure."
  ],
  documentDiagnosticExportDropped: [
    "这一处内容无法导出，且不含可保留的文字，已从文件中省略。",
    "This content could not be exported and had no text to keep, so it was omitted."
  ],
  documentDiagnosticSchemaInvalidBlock: [
    "这一段内容不符合编辑器的文档结构，已按纯文本导入。",
    "This block does not fit the editor's document structure and was imported as plain text."
  ],
  documentDiagnosticContributionSkipped: [
    "文档的一项附加数据未能写入，已跳过。",
    "One piece of supplementary document data could not be written and was skipped."
  ],
  documentDiagnosticTableRevisionFallback: [
    "表格中未处理的修订无法原样保存，已按接受修订后的结果导出。",
    "Pending table revisions could not be saved as-is and were exported as accepted."
  ],
  documentDiagnosticPictureDropped: [
    "这张图片无法嵌入导出文件，已省略。",
    "This picture could not be embedded in the exported file and was omitted."
  ],
  documentDiagnosticSectionMissingDefaulted: [
    "文档没有页面设置，已按 A4 默认页面导入。",
    "The document has no page settings and was imported with the default A4 page."
  ],
  documentDiagnosticSectionTrailingContentAdopted: [
    "文档末尾的页面设置之后还有内容，已归入最后一节。",
    "Content after the final page settings was placed in the last section."
  ],
  documentDiagnosticLocate: ["定位", "Locate"],
  documentCompatibilityInformation: [
    "查看兼容信息",
    "View compatibility information"
  ],
  documentDiagnosticDetails: ["诊断详情", "Diagnostic details"],
  documentDiagnosticCopyActions: ["复制诊断详情", "Copy diagnostic details"],
  documentDiagnosticCopyAll: ["复制全部", "Copy all"],
  documentDiagnosticCopyDeduplicated: ["去重复制", "Copy deduplicated"],
  documentDiagnosticCopied: ["已复制", "Copied"],
  documentDiagnosticCopyFailed: ["复制失败", "Copy failed"],
  quireKitJson: ["QuireKit JSON", "QuireKit JSON"],
  horizontalRule: ["分隔线", "Horizontal rule"],
  rule: ["分隔线", "Rule"],
  horizontalRulePresets: ["分隔线样式", "Horizontal rule styles"],
  horizontalRuleThin: ["细单线", "Thin line"],
  horizontalRuleStandard: ["标准单线", "Standard line"],
  horizontalRuleThick: ["粗单线", "Thick line"],
  horizontalRuleDouble: ["双线", "Double line"],
  horizontalRuleDotted: ["点线", "Dotted line"],
  horizontalRuleDashed: ["虚线", "Dashed line"],
  horizontalRuleShaded: ["立体阴影线", "Shaded line"],
  view: ["视图", "View"],
  ruler: ["标尺", "Ruler"],
  invisibleCharacters: ["显示不可见字符", "Show invisible characters"],
  hiddenText: ["显示隐藏文字", "Show hidden text"],
  outline: ["大纲", "Outline"],
  properties: ["属性", "Properties"],
  home: ["开始", "Home"],
  history: ["历史记录", "History"],
  text: ["文本", "Text"],
  fontFamily: ["字体", "Font family"],
  fontSize: ["字号", "Font size"],
  increaseFontSize: ["增大字号", "Increase font size"],
  decreaseFontSize: ["减小字号", "Decrease font size"],
  textColor: ["字体颜色", "Text color"],
  backgroundColor: ["文字背景色", "Text background color"],
  textHighlight: ["荧光笔", "Text highlight color"],
  resetColor: ["清除颜色", "Reset color"],
  defaultColor: ["默认", "Default"],
  recentColors: ["最近使用颜色", "Recent colors"],
  recentFonts: ["最近使用", "Recent fonts"],
  moreColors: ["更多颜色", "More colors"],
  allScriptFonts: ["全部文字字体", "All-script font"],
  eastAsianFont: ["中文 / 东亚文字字体", "Chinese / East Asian font"],
  latinFont: ["西文字体", "Latin / Western font"],
  complexScriptFont: ["复杂文字字体", "Complex-script font"],
  documentFont: ["文档字体设置", "Document font settings"],
  globalSettings: ["全局设置", "Global settings"],
  globalFontSettingsDescription: [
    "分别设置文档默认的中文和西文字体。已有直接格式不会被修改。",
    "Set the document's default Chinese and Western fonts separately. Existing direct formatting is preserved."
  ],
  allScriptFontsShort: ["全部", "All"],
  eastAsianFontShort: ["中文", "Chinese"],
  latinFontShort: ["西文", "Latin"],
  complexScriptFontShort: ["复杂文字", "Complex script"],
  documentFontShort: ["文档字体设置", "Document font settings"],
  fontHub: ["字体中心", "Font Hub"],
  fontCatalog: ["字体库", "Font library"],
  manageFonts: ["管理字体", "Manage fonts"],
  importedFonts: ["已添加字体", "Added fonts"],
  fontHubNotice: ["添加后可在工具栏选择使用，不会自动修改文档或安装系统字体。", "After adding, choose the font in the toolbar. This does not change the document or install system fonts."],
  fontSourceNotice: ["内置字体源已可使用；需要密钥的来源请先配置。网络可用性取决于字体提供方。", "Built-in sources are ready to use; configure sources that require a key. Network availability depends on the provider."],
  fontPreviewText: ["预览样文", "Preview text"],
  fontPreviewSize: ["预览字号", "Preview size"],
  fontPreviewHint: ["点击预览会加载字体资源，样文不会发送给字体源。", "Preview loads font resources; sample text is not sent to the provider."],
  collapseFontPreview: ["收起预览", "Hide preview"],
  fontAddFailed: ["添加字体失败", "Could not add font"],
  fontCacheRecorded: ["已保存缓存记录", "Cache recorded"],
  fontRemoveNotice: ["移除字体及其浏览器缓存，不会修改文档中的字体设置。使用它的文档可能显示替代字体。", "Removes the font and its browser cache, not the document's font settings. Documents using it may display a fallback."],
  confirmRemoveFont: ["确认移除", "Confirm removal"],
  clearFontFilters: ["清除筛选", "Clear filters"],
  retryFontSearch: ["重试", "Retry"],
  configureFontSource: ["配置字体源", "Configure source"],
  fontSettingRequired: ["请填写此项后保存", "Complete this field before saving"],
  advancedFontSources: ["高级：自定义字体源", "Advanced: custom sources"],
  fontDescriptorHelp: ["仅适用于提供 QuireKit 字体目录协议的来源。请填写来源提供的 JSON 描述地址，不是网站首页、CSS 或字体文件链接。", "For sources implementing the QuireKit font catalog protocol. Paste their JSON descriptor URL, not a homepage, CSS, or font file URL."],
  fontSources: ["字体源", "Font sources"],
  customFontSources: ["自定义字体源", "Custom font sources"],
  addFontSource: ["添加字体源", "Add font source"],
  descriptorUrl: ["字体源描述文件 URL", "Font source descriptor URL"],
  testFontSource: ["测试连接", "Test source"],
  testingFontSource: ["正在测试…", "Testing…"],
  enableFontSource: ["启用字体源", "Enable source"],
  removeFontSource: ["移除源", "Remove source"],
  noCustomFontSources: ["还没有添加自定义字体源", "No custom font sources yet"],
  sourceValidated: ["字体源有效，可以启用", "Source is valid and ready to enable"],
  sourceEnabled: ["字体源已启用", "Font source enabled"],
  sourceRemoved: ["字体源已移除，已添加字体仍会保留", "Source removed; added fonts are retained"],
  sourceTestFailed: ["字体源校验失败", "Font source validation failed"],
  sourceSettings: ["字体源设置", "Source settings"],
  saveSourceSettings: ["保存设置", "Save settings"],
  sourceSettingsSaved: ["设置已保存在当前浏览器", "Settings saved in this browser"],
  sourceSecretNotice: [
    "密钥只保存在当前浏览器，不写入文档。",
    "Keys stay in this browser and are never written into documents."
  ],
  sourceLocalNotice: [
    "设置只保存在当前浏览器，不写入文档。",
    "Settings stay in this browser and are never written into documents."
  ],
  selectFontSource: ["选择字体源", "Select font source"],
  noFontSources: ["没有配置字体源", "No font sources configured"],
  noSourceSettings: ["此字体源无需额外设置", "This source needs no additional settings"],
  searchFonts: ["搜索字体", "Search fonts"],
  searchingFonts: ["正在搜索…", "Searching…"],
  searchFontPlaceholder: ["输入字体名称", "Search by font family"],
  filterByLanguage: ["按语言筛选", "Filter by language"],
  allLanguages: ["全部语言", "All languages"],
  allFonts: ["全部字体", "All fonts"],
  searchResults: ["搜索结果", "Search results"],
  recommendedFonts: ["推荐字体", "Recommended fonts"],
  addRecommendedFonts: ["添加全部", "Add all"],
  recommendedFontsAdded: ["推荐字体已添加", "Recommended fonts added"],
  available: ["已可用", "Available"],
  previewFont: ["预览", "Preview"],
  previewReady: ["已预览", "Preview ready"],
  previewFontFailed: ["字体预览加载失败", "Font preview failed"],
  importFont: ["添加", "Add"],
  importingFont: ["正在添加…", "Adding…"],
  licenseInformation: ["许可", "License"],
  importAndDownload: ["离线可用", "Available offline"],
  imported: ["已添加", "Added"],
  removeFont: ["移除", "Remove"],
  noImportedFonts: ["还没有添加字体", "No fonts added yet"],
  noFontResults: ["没有找到字体", "No fonts found"],
  searchSourceFirst: ["请先完成字体源设置", "Configure this font source before searching"],
  fontSearchFailed: ["搜索字体失败", "Font search failed"],
  close: ["关闭", "Close"],
  fontSubstituted: [
    "使用 {rendered} 替代显示",
    "Displaying with {rendered}"
  ],
  fontUnresolved: [
    "使用备用字体显示",
    "Displaying with a fallback font"
  ],
  externalFontSource: ["来源：{source}", "Source: {source}"],
  externalFontLicense: ["许可：{license}", "License: {license}"],
  externalFontNotice: [
    "仅在点击下载后连接字体源；字体文件由该来源提供。",
    "The provider is contacted only after you click download; it supplies the font files."
  ],
  downloadAndUseFont: ["下载并使用", "Download and use"],
  downloadingFont: ["正在下载…", "Downloading…"],
  fontInstalled: ["已安装", "Installed"],
  retryFontDownload: ["重试下载", "Retry download"],
  fontDownloadFailed: ["字体下载失败", "Font download failed"],
  content: ["内容", "Content"],
  panels: ["面板", "Panels"],
  bold: ["加粗", "Bold"],
  italic: ["斜体", "Italic"],
  underline: ["下划线", "Underline"],
  strike: ["删除线", "Strikethrough"],
  superscript: ["上标", "Superscript"],
  subscript: ["下标", "Subscript"],
  formatPainter: ["格式刷", "Format painter"],
  clearFormatting: ["清除格式", "Clear formatting"],
  documentProperties: ["文档属性", "Document properties"],
  documentMenus: ["文档菜单", "Document menus"],
  documentTasks: ["文档任务", "Document tasks"],
  moreTasks: ["更多任务", "More tasks"],
  documentStatus: ["文档状态", "Document status"],
  documentName: ["文档名称", "Document name"],
  menu: ["菜单", "Menu"],
  untitledDocument: ["未命名文档", "Untitled document"],
  developerWorkspace: ["诊断工作区", "Diagnostic workspace"],
  quickActions: ["快速操作", "Quick actions"],
  selectionActions: ["选区操作", "Selection actions"],
  documentRibbon: ["文档功能区", "Document ribbon"],
  moreCommands: ["更多命令", "More commands"],
  documentPages: ["文档页面", "Document pages"],
  renderingBackend: ["渲染方式", "Rendering backend"],
  interfaceLanguage: ["界面语言", "Interface language"],
  mixed: ["多值", "Mixed"],
  untitledHeading: ["未命名标题", "Untitled heading"],
  addHeadingsToOutline: ["添加标题后将在这里生成大纲。", "Add headings to build an outline."],
  mode: ["模式", "Mode"],
  paginatedCanvas: ["分页 Canvas", "Paginated Canvas"],
  paginatedSvg: ["分页 SVG", "Paginated SVG"],
  editable: ["可编辑", "Editable"],
  yes: ["是", "Yes"],
  no: ["否", "No"],
  caret: ["插入点", "Caret"],
  caretInTarget: ["插入点：{label}", "Caret in {label}"],
  selectedCharacters: ["已选择 {count} 个字符", "{count} selected"],
  selectedBlocks: ["已选择 {count} 个块", "Selected blocks: {count}"],
  selectionDetailsUnavailable: [
    "当前选区的详细状态暂不可用",
    "Selection details are unavailable"
  ],
  objectTarget: ["对象", "Object"],
  nodeTarget: ["对象：{label}", "Object: {label}"],
  imageTarget: ["图片：{label}", "Image: {label}"],
  imageObjectTarget: ["图片", "Image"],
  tableTarget: ["表格", "Table"],
  tableTargetDimensions: [
    "表格 {rows} 行 × {columns} 列",
    "Table {rows} × {columns}"
  ],
  tableCellTarget: [
    "表格 {rows} 行 × {columns} 列，第 {row} 行第 {column} 列",
    "Table {rows} × {columns}, row {row}, column {column}"
  ],
  tableSelectedCells: [
    "表格：已选择 {count} 个单元格",
    "Table: {count} cells selected"
  ],
  contentControlTarget: ["内容控件", "Content control"],
  controlTarget: ["控件：{label}", "Control: {label}"],
  documentStoryTarget: ["文档正文", "Document body"],
  storyTarget: ["文档区域：{label}", "Document area: {label}"],
  statusModeEdit: ["编辑模式", "Editing"],
  statusModeReadOnly: ["只读模式", "Read only"],
  statusModeTemplate: ["模板模式", "Template mode"],
  statusModeFill: ["填写模式", "Fill mode"],
  statusLocked: ["已锁定", "Locked"],
  wordCountOne: ["{count} 字", "{count} word"],
  wordCountMany: ["{count} 字", "{count} words"],
  printLayout: ["打印布局", "Print layout"],
  starterDocument: [
    "开始使用 QuireKit Classic Editor 写作。",
    "Start writing with QuireKit Classic Editor."
  ]
} as const;

/** Stable keys for all product-owned built-in copy. */
export type BuiltinClassicEditorMessageKey = keyof typeof messageDefinitions;

/** Replacement values accepted by parameterized built-in messages. */
export type BuiltinClassicEditorMessageParameters = Readonly<
  Record<string, string | number>
>;

/** Every built-in message key, exposed for completeness tests and diagnostics. */
export const builtinClassicEditorMessageKeys = Object.freeze(
  Object.keys(messageDefinitions) as BuiltinClassicEditorMessageKey[]
);

/**
 * Returns complete bilingual text for one product-owned message.
 *
 * @param key - Stable built-in message key.
 * @returns Frozen Chinese and English contribution copy.
 */
export function getBuiltinClassicEditorText(
  key: BuiltinClassicEditorMessageKey
): ClassicEditorBilingualText {
  const [zhCN, en] = messageDefinitions[key];
  return Object.freeze({ "zh-CN": zhCN, en });
}

/**
 * Resolves and formats one product-owned message for the active locale.
 *
 * @param locale - Active Classic Editor locale.
 * @param key - Stable built-in message key.
 * @param parameters - Optional named placeholder replacements.
 * @returns Localized product copy with every placeholder resolved.
 */
export function resolveBuiltinClassicEditorMessage(
  locale: ClassicEditorLocale,
  key: BuiltinClassicEditorMessageKey,
  parameters: BuiltinClassicEditorMessageParameters = {}
): string {
  const template = getBuiltinClassicEditorText(key)[locale];
  return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/gu, (_placeholder, name: string) => {
    const value = parameters[name];
    if (value === undefined) {
      throw new RangeError(`Missing Classic Editor message parameter "${name}".`);
    }
    return String(value);
  });
}
