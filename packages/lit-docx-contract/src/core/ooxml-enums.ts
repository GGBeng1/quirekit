/**
 * OOXML 枚举值定义；枚举成员的值与 OOXML 原始字符串一致，可直接用于比较与序列化。
 */

/** 页眉页脚引用类型 ST_HdrFtr（headerType/footerType attr） */
export enum HeaderFooterType {
  /** 默认页眉页脚；启用奇偶页时用于奇数页 */
  Default = 'default',
  /** 不同首页启用时使用的首页页眉页脚 */
  First = 'first',
  /** 启用奇偶页时使用的偶数页页眉页脚 */
  Even = 'even',
}
