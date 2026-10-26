import type { QuireKitLocalePack } from "../../locale/types";

/** QuireLocaleProvider 的公开属性。 */
export interface QuireKitLocaleProviderProps {
  /** 界面语言的 BCP 47 标签，如 `zh-CN`、`en`；未知地区先匹配基础语言，仍无匹配时使用中文。 */
  readonly locale?: string;
  /** 新增或调整的语言包，优先于内置语言。 */
  readonly packs?: readonly QuireKitLocalePack[];
}
