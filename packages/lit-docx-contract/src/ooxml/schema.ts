/**
 * OOXML Schema DSL — 声明式定义 OOXML 元素结构
 *
 * 从 XSD 模式翻译为 TypeScript 声明，驱动 OoxmlElement 基类的
 * 自动解析（fromXml）和生成（toXml）。
 *
 * XSD 中的核心模式：
 *   1. 纯属性元素（如 CT_OnOff: 只有 val 属性）
 *   2. 属性 + 子元素（如 CT_P: 有 rsidR 属性 + pPr/runs 子元素）
 *   3. 文本内容元素（如 w:t: 内含纯文本）
 *   4. choice 分支（如 CT_PosH: align 或 posOffset 二选一）
 */

// ============================================================
// Schema 类型定义
// ============================================================

/** 属性类型 */
export type AttrType = 'string' | 'number' | 'boolean' | 'onoff'

/** 属性定义 */
export interface AttrDef {
  /** 属性在 XML 中的名称（含命名空间前缀），如 'w:val', 'r:id' */
  xmlName: string
  /** TypeScript 值类型 */
  type: AttrType
  /** 是否必需（XSD use="required"） */
  required?: boolean
  /** 默认值 */
  defaultValue?: any
  /** 中文描述（来自 XSD annotation） */
  doc?: string
}

/** 子元素内容类型 */
export type ChildContentType =
  | 'element'     // 子元素是另一个 OoxmlElement 类型
  | 'text'        // 子元素包含纯文本内容（如 w:t, wp:align）
  | 'number'      // 子元素包含数字文本（如 wp:posOffset）
  | 'raw'         // 保留原始 XML 子树（不做深度解析，用于 roundtrip 保真）
  | 'presence'    // 仅检测存在性（如 wp:wrapNone），值为 boolean

/** 子元素定义 */
export interface ChildDef {
  /** 元素在 XML 中的标签名（含命名空间前缀），如 'w:pPr', 'wp:align' */
  xmlName: string
  /** 内容类型 */
  contentType: ChildContentType
  /** 如果 contentType 是 'element'，对应的 OoxmlElement 子类 */
  elementClass?: any
  /** 最小出现次数（0=可选，1=必需） */
  min?: number
  /** 最大出现次数（1=单个，Infinity=列表） */
  max?: number
  /** 所属 choice 组名（同组内只能存在一个） */
  choiceGroup?: string
  /** 中文描述 */
  doc?: string
}

/** 完整的元素 Schema 定义 */
export interface ElementSchema {
  /** XML 标签名（含命名空间前缀），如 'w:p', 'wp:positionH' */
  tag: string
  /** 属性定义，key 是在对象上的字段名 */
  attrs: Record<string, AttrDef>
  /** 子元素定义（按 XSD sequence 顺序排列），key 是在对象上的字段名 */
  children: Record<string, ChildDef>
  /** 该元素本身是否包含直接文本内容（如 w:t） */
  textContent?: boolean
  /** 中文描述 */
  doc?: string
}

// ============================================================
// Schema DSL 辅助函数 — 简化声明
// ============================================================

/** 定义一个字符串属性 */
export function stringAttr(xmlName: string, options?: { required?: boolean; doc?: string }): AttrDef {
  return { xmlName, type: 'string', ...options }
}

/** 定义一个数字属性 */
export function numberAttr(xmlName: string, options?: { required?: boolean; doc?: string }): AttrDef {
  return { xmlName, type: 'number', ...options }
}

/** 定义一个布尔属性 */
export function boolAttr(xmlName: string, options?: { required?: boolean; doc?: string }): AttrDef {
  return { xmlName, type: 'boolean', ...options }
}

/** 定义一个 on/off 属性（OOXML 特有：true/false/1/0/on/off） */
export function onoffAttr(xmlName: string, options?: { doc?: string }): AttrDef {
  return { xmlName, type: 'onoff', ...options }
}

/** 定义一个子元素（引用另一个 OoxmlElement 类型） */
export function childElement(
  xmlName: string,
  elementClass: any,
  options?: { min?: number; max?: number; choiceGroup?: string; doc?: string },
): ChildDef {
  return { xmlName, contentType: 'element', elementClass, min: 0, max: 1, ...options }
}

/** 定义一个文本内容子元素（如 wp:align 内含 "center"） */
export function childText(
  xmlName: string,
  options?: { min?: number; max?: number; choiceGroup?: string; doc?: string },
): ChildDef {
  return { xmlName, contentType: 'text', min: 0, max: 1, ...options }
}

/** 定义一个数字内容子元素（如 wp:posOffset 内含 "914400"） */
export function childNumber(
  xmlName: string,
  options?: { min?: number; max?: number; choiceGroup?: string; doc?: string },
): ChildDef {
  return { xmlName, contentType: 'number', min: 0, max: 1, ...options }
}

/** 定义一个可重复子元素列表 */
export function childList(
  xmlName: string,
  elementClass: any,
  options?: { doc?: string },
): ChildDef {
  return { xmlName, contentType: 'element', elementClass, min: 0, max: Infinity, ...options }
}

/** 定义一个原始 XML 子元素（保留完整子树，不做解析，用于 roundtrip 保真） */
export function childRaw(
  xmlName: string,
  options?: { min?: number; max?: number; choiceGroup?: string; doc?: string },
): ChildDef {
  return { xmlName, contentType: 'raw', min: 0, max: 1, ...options }
}

/** 定义一个存在性子元素（仅检测是否存在，值为 boolean，如 wp:wrapNone） */
export function childPresence(
  xmlName: string,
  options?: { choiceGroup?: string; doc?: string },
): ChildDef {
  return { xmlName, contentType: 'presence', min: 0, max: 1, ...options }
}
