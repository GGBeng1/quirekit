import type { QuireKitInputType } from "../../components/input/types";

/** Input and plain-text input guidance. */
export interface Messages {
  /** Default empty hint for each native text input kind. */
  readonly placeholder: Readonly<Record<QuireKitInputType, string>>;
  /** Empty hint naming the host's visible field. */
  readonly fieldPlaceholder: (label: string) => string;
  /** Accessible name of the clear action. */
  readonly clear: string;
  /** Accessible name of the action that reveals a password. */
  readonly showPassword: string;
  /** Accessible name of the action that masks a password. */
  readonly hidePassword: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  placeholder: { text: "请输入内容", search: "搜索内容", email: "请输入邮箱地址", password: "请输入密码", tel: "请输入电话号码", url: "请输入网址" },
  fieldPlaceholder: label => `请输入${label}`,
  clear: "清除输入",
  showPassword: "显示密码",
  hidePassword: "隐藏密码"
};

/** English. */
export const en: Messages = {
  placeholder: { text: "Enter text", search: "Search", email: "Enter email address", password: "Enter password", tel: "Enter phone number", url: "Enter URL" },
  fieldPlaceholder: label => `Enter ${label}`,
  clear: "Clear input",
  showPassword: "Show password",
  hidePassword: "Hide password"
};
