/** 按文件查阅示例源码；加载与高亮仍由调用方负责。 */
export interface QuireKitProseFilesProps {
  /** 有序的相对文件路径；第一项是示例入口。 */
  readonly files: readonly string[];
  /** 文件选择器的可访问名称；默认取自语言包。 */
  readonly label?: string;
}

/** 当前文件的惰性内容。 */
export interface QuireKitProseFilesSlots {
  /** 只为当前文件创建内容；切换后卸载前一文件。 */
  default?: (props: { /** 当前有效的相对文件路径。 */ file: string }) => unknown;
}
