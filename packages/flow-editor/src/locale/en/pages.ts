/** Physical page and explicit print interface messages. */
export const pages: Readonly<Record<string, string>> = {
  "页面与打印…": "Page setup and print…", "页面与打印": "Page setup and print",
  "设置纸张并预览分页，可直接下载 PDF 或打印。": "Set up paper and preview pages. Download a PDF directly or print.",
  "下载 PDF": "Download PDF", "应用尚未配置 PDF 字体": "The application has not configured PDF fonts.",
  "PDF 字体配置无效": "Invalid PDF font configuration.", "PDF 字体超过资源预算": "PDF fonts exceed the resource budget.", "PDF 超过输出预算": "The PDF exceeds the output budget.",
  "PDF SVG 含不支持的绘制内容": "The SVG contains unsupported drawing content.", "PDF SVG 含外部资源": "The SVG contains external resources.",
  "设置纸张并预览分页，可打印或通过系统对话框保存 PDF。": "Set up paper and preview pages. Print or save a PDF through the system dialog.",
  "纸张": "Paper", "方向": "Orientation", "纵向": "Portrait", "横向": "Landscape", "打印比例": "Print scale", "适合单页": "Fit on one page", "固定比例": "Fixed scale", "比例": "Scale",
  "上边距": "Top margin", "右边距": "Right margin", "下边距": "Bottom margin", "左边距": "Left margin",
  "打印页面预览": "Print page preview", "分页预览": "Page preview", "上一页": "Previous page", "下一页": "Next page",
  "第 {page} 页，共 {total} 页": "Page {page} of {total}", "{columns} 列 × {rows} 行 · 实际比例 {scale}%": "{columns} columns × {rows} rows · Effective scale {scale}%",
  "虚线仅显示可打印区域。打印使用白色纸张，保留图形指定颜色。": "The dashed border marks the printable area. Output uses white paper and retains explicit diagram colours.",
  "请输入有效页边距和 10%–400% 的比例": "Enter valid margins and a scale between 10% and 400%.",
  "分页超过 100 页，请减小比例或适合单页": "More than 100 pages. Reduce the scale or fit on one page.",
  "下载打印文件": "Download printable file", "打印 / 保存 PDF": "Print / Save PDF", "保存页面设置": "Save page settings",
  "打印需要浏览器文档": "Printing requires a browser document.", "打印快照含不支持的内容": "The print snapshot contains unsupported content.", "打印快照含外部资源": "The print snapshot contains external resources.",
  "打印预览加载超时，请下载打印文件": "Print preview timed out. Download the printable file.", "无法打开打印预览，请下载打印文件": "Unable to open print preview. Download the printable file.",
};
