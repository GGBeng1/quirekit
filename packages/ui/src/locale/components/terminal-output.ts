/** TerminalOutput interface text. */
export interface Messages {
  /** Default accessible name of the output. */
  readonly label: string;
  /** Copied content named in the copy button's accessible name. */
  readonly copyTarget: string;
  /** Process still running. */
  readonly running: string;
  /** Process completed successfully. */
  readonly succeeded: string;
  /** Process failed. */
  readonly failed: string;
  /** Process was cancelled. */
  readonly cancelled: string;
  /** Exit code shown after the status. */
  readonly exitCode: (code: number) => string;
  /** Older rendered output was omitted. */
  readonly clipped: string;
  /** Return to the live tail. */
  readonly follow: string;
  /** Switch to the raw source view. */
  readonly source: string;
  /** Switch back to the rendered view. */
  readonly rendered: string;
  /** No output yet. */
  readonly empty: string;
  /** Accessible name of the rendered output area, given the output label. */
  readonly content: (label: string) => string;
  /** Accessible name of the raw source area, given the output label. */
  readonly sourceContent: (label: string) => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  label: "终端输出", copyTarget: "完整输出", running: "运行中", succeeded: "已完成", failed: "运行失败", cancelled: "已取消",
  exitCode: code => `退出码 ${code}`, clipped: "已隐藏较早输出", follow: "回到底部", source: "原文", rendered: "预览",
  empty: "暂无输出", content: label => `${label}内容`, sourceContent: label => `${label}原文`
};

/** English. */
export const en: Messages = {
  label: "Terminal output", copyTarget: "full output", running: "Running", succeeded: "Completed", failed: "Failed", cancelled: "Cancelled",
  exitCode: code => `Exit code ${code}`, clipped: "Earlier output hidden", follow: "Jump to bottom", source: "Source", rendered: "Preview",
  empty: "No output yet", content: label => `${label} content`, sourceContent: label => `${label} source`
};
