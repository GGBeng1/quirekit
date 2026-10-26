/** QRCode 的界面文案。 */
export interface Messages {
  /** 内容为空时的提示。 */
  readonly empty: string;
  /** 内容无法编码时的提示。 */
  readonly error: string;
  /** 导出时二维码尚未生成或挂载的错误说明。 */
  readonly unavailable: string;
  /** 下载时二维码已卸载的错误说明。 */
  readonly unmounted: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  empty: "输入内容后生成二维码",
  error: "无法生成二维码，请检查或缩短内容",
  unavailable: "二维码尚未生成或挂载",
  unmounted: "二维码已卸载"
};

/** English. */
export const en: Messages = {
  empty: "Enter content to generate a QR code",
  error: "Can't generate a QR code. Check or shorten the content",
  unavailable: "The QR code isn't generated or mounted yet",
  unmounted: "The QR code has been unmounted"
};
