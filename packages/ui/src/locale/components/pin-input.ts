/** PinInput interface text. */
export interface Messages {
  /** Accessible field name when the host gives no label. */
  readonly label: string;
  /** Accessible name of one cell; index is zero-based. */
  readonly cell: (label: string, index: number, length: number) => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  label: "验证码",
  cell: (label, index, length) => `${label}，第 ${index + 1} 位，共 ${length} 位`
};

/** English. */
export const en: Messages = {
  label: "Verification code",
  cell: (label, index, length) => `${label}, character ${index + 1} of ${length}`
};
