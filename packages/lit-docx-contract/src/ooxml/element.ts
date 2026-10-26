/**
 * OoxmlElement 基类 — 所有 OOXML 元素类的基础
 *
 * 提供基于 Schema 声明的自动 parse/generate 能力：
 *   - fromXml(): 从 fast-xml-parser 的 preserveOrder 输出解析
 *   - toXml(): 生成 fast-xml-parser preserveOrder 格式的对象
 *
 * 子类只需声明 static schema，即可获得完全对称的解析和生成。
 * 如果默认行为不满足需求，子类可以覆写 fromXml/toXml。
 *
 * 数据流：
 *   解析：XML string → fast-xml-parser → XmlElement → OoxmlElement.fromXml() → 对象实例
 *   生成：对象实例 → toXml() → XmlElement → XML string
 */
import type { ElementSchema, AttrDef } from './schema.js'

/** fast-xml-parser preserveOrder 格式的 XML 元素 */
export type XmlElement = Record<string, any>

/**
 * 将 OOXML 的 on/off 值标准化为布尔值
 * XSD ST_OnOff 允许：true, false, 1, 0, on, off
 * 无 val 属性时默认为 true（如 <w:b/> 等同于 <w:b val="true"/>）
 */
function parseOnOff(val: string | undefined): boolean {
  if (val === undefined || val === null) return true // <w:b/> 无 val 等于 true
  return val === 'true' || val === '1' || val === 'on'
}

/** 将布尔值转换回 OOXML on/off 字符串 */
function toOnOff(val: boolean): string {
  // 简化：true 时不输出 val 属性（<w:b/>），false 时输出 val="false"
  // 实际上 Word 通常用 val="0" 表示 false
  return val ? '1' : '0'
}

/**
 * 从 preserveOrder 格式的子元素数组中查找指定标签的元素
 */
function findChild(children: XmlElement[], tagName: string): XmlElement | undefined {
  return children.find((c: XmlElement) => c[tagName] !== undefined)
}

/**
 * 从 preserveOrder 格式的子元素数组中查找所有匹配标签的元素
 */
function findAllChildren(children: XmlElement[], tagName: string): XmlElement[] {
  return children.filter((c: XmlElement) => c[tagName] !== undefined)
}

/**
 * 从 preserveOrder 元素中提取属性值
 * preserveOrder 格式下属性存储在 ':@' key 中，前缀 '@_'
 */
function getXmlAttr(element: XmlElement, attrXmlName: string): string | undefined {
  return element?.[':@']?.['@_' + attrXmlName]
}

/**
 * 从 preserveOrder 元素中提取文本内容
 * 文本存储在子数组的 '#text' key 中
 */
function getTextContent(children: XmlElement[]): string | undefined {
  for (const child of children) {
    if (child['#text'] !== undefined) {
      return String(child['#text'])
    }
  }
  return undefined
}

/**
 * OoxmlElement 基类
 *
 * 使用方式：
 * ```typescript
 * class CT_PosH extends OoxmlElement {
 *   static schema: ElementSchema = {
 *     tag: 'wp:positionH',
 *     attrs: {
 *       relativeFrom: stringAttr('relativeFrom', { required: true }),
 *     },
 *     children: {
 *       align: childText('wp:align', { choiceGroup: 'pos' }),
 *       posOffset: childNumber('wp:posOffset', { choiceGroup: 'pos' }),
 *     },
 *   }
 * }
 *
 * // 解析
 * const pos = CT_PosH.fromXml(xmlElement)
 * pos.data.relativeFrom  // 'margin'
 * pos.data.align         // 'center'
 *
 * // 生成
 * const xml = pos.toXml()
 * ```
 */
export class OoxmlElement {
  /**
   * Schema 声明 — 子类必须定义
   * 不在基类上赋值，强制子类提供
   */
  static schema: ElementSchema

  /**
   * 元素数据 — 存储解析出的属性值和子元素值
   * key 是 schema 中定义的字段名，value 是解析后的值
   */
  data: Record<string, any> = {}

  /**
   * 原始 XML 元素引用（用于保留未处理的信息）
   */
  rawElement?: XmlElement

  /**
   * 未建模的子元素（schema 未覆盖的 XML 子节点）
   * 在 roundtrip 时原样保留，如 a:graphic、wp:cNvGraphicFramePr 等深层结构
   */
  _unmodeledChildren: XmlElement[] = []

  /**
   * 从 fast-xml-parser preserveOrder 格式的 XML 元素解析
   *
   * @param xmlElement - preserveOrder 格式的元素对象
   *   格式：{ "wp:positionH": [...children], ":@": { "@_relativeFrom": "margin" } }
   * @returns 解析后的实例
   */
  static fromXml<T extends OoxmlElement>(
    this: new () => T,
    xmlElement: XmlElement,
  ): T {
    const schema = (this as any).schema as ElementSchema
    if (!schema) {
      throw new Error(`${this.name} 未定义 static schema`)
    }

    const instance = new this()
    instance.rawElement = xmlElement

    // 获取子元素数组（preserveOrder 格式下是 element[tag] = [...children]）
    const children: XmlElement[] = xmlElement[schema.tag] || []

    // --- 解析属性 ---
    for (const [fieldName, attrDef] of Object.entries(schema.attrs)) {
      const rawValue = getXmlAttr(xmlElement, attrDef.xmlName)
      instance.data[fieldName] = parseAttrValue(rawValue, attrDef)
    }

    // --- 解析文本内容（如 w:t 元素） ---
    if (schema.textContent) {
      instance.data._text = getTextContent(children)
    }

    // --- 解析子元素 ---
    // 收集 schema 覆盖的标签名，用于后续识别未建模子元素
    const modeledTags = new Set<string>()
    for (const [fieldName, childDef] of Object.entries(schema.children)) {
      modeledTags.add(childDef.xmlName)

      if (childDef.contentType === 'presence') {
        // 存在性子元素：仅检测是否存在
        const matched = findChild(children, childDef.xmlName)
        instance.data[fieldName] = matched !== undefined
        // 保留原始元素用于 roundtrip（可能带属性）
        if (matched) {
          instance.data['_raw_' + fieldName] = matched
        }
        continue
      }

      if (childDef.contentType === 'raw') {
        // 原始子元素：保留完整 XML 子树不做解析
        const matched = findChild(children, childDef.xmlName)
        instance.data[fieldName] = matched || undefined
        continue
      }

      if (childDef.max === Infinity) {
        // 列表子元素：收集所有匹配的
        const matchedElements = findAllChildren(children, childDef.xmlName)
        if (childDef.contentType === 'element' && childDef.elementClass) {
          instance.data[fieldName] = matchedElements.map(
            (el) => childDef.elementClass.fromXml(el),
          )
        } else {
          instance.data[fieldName] = matchedElements.map((el) => {
            const innerChildren = el[childDef.xmlName] || []
            return childDef.contentType === 'number'
              ? Number(getTextContent(innerChildren) || 0)
              : getTextContent(innerChildren)
          })
        }
      } else {
        // 单个子元素
        const matched = findChild(children, childDef.xmlName)
        if (!matched) {
          instance.data[fieldName] = undefined
          continue
        }

        if (childDef.contentType === 'element' && childDef.elementClass) {
          instance.data[fieldName] = childDef.elementClass.fromXml(matched)
        } else {
          const innerChildren = matched[childDef.xmlName] || []
          const textVal = getTextContent(innerChildren)
          instance.data[fieldName] = childDef.contentType === 'number'
            ? (textVal !== undefined ? Number(textVal) : undefined)
            : textVal
        }
      }
    }

    // --- 收集未建模的子元素（schema 未覆盖的标签），用于 roundtrip 保真 ---
    for (const child of children) {
      const tag = Object.keys(child).find(k => k !== ':@' && k !== '#text')
      if (tag && !modeledTags.has(tag)) {
        instance._unmodeledChildren.push(child)
      }
    }

    return instance
  }

  /**
   * 生成 fast-xml-parser preserveOrder 格式的 XML 对象
   *
   * @returns preserveOrder 格式对象，可直接用于 XML 序列化
   */
  toXml(): XmlElement {
    const schema = (this.constructor as typeof OoxmlElement).schema
    if (!schema) {
      throw new Error(`${this.constructor.name} 未定义 static schema`)
    }

    const children: XmlElement[] = []
    const attrs: Record<string, string> = {}

    // --- 生成属性 ---
    for (const [fieldName, attrDef] of Object.entries(schema.attrs)) {
      const value = this.data[fieldName]
      const serialized = serializeAttrValue(value, attrDef)
      if (serialized !== undefined) {
        attrs['@_' + attrDef.xmlName] = serialized
      }
    }

    // --- 生成文本内容 ---
    if (schema.textContent && this.data._text !== undefined) {
      children.push({ '#text': this.data._text })
    }

    // --- 生成子元素（按 schema 声明顺序，保证 XSD sequence 正确） ---
    for (const [fieldName, childDef] of Object.entries(schema.children)) {
      const value = this.data[fieldName]

      // 存在性子元素：值为 true 时输出
      if (childDef.contentType === 'presence') {
        if (value === true) {
          // 优先使用保留的原始元素（可能带属性）
          const rawEl = this.data['_raw_' + fieldName]
          if (rawEl) {
            children.push(rawEl)
          } else {
            children.push({ [childDef.xmlName]: [] })
          }
        }
        continue
      }

      // 原始子元素：直接输出保留的 XML 子树
      if (childDef.contentType === 'raw') {
        if (value !== undefined && value !== null) {
          children.push(value)
        }
        continue
      }

      // 跳过 undefined/null/空数组
      if (value === undefined || value === null) continue
      if (Array.isArray(value) && value.length === 0) continue

      if (childDef.max === Infinity && Array.isArray(value)) {
        // 列表子元素
        for (const item of value) {
          if (childDef.contentType === 'element' && item instanceof OoxmlElement) {
            children.push(item.toXml())
          } else {
            children.push(createTextElement(childDef.xmlName, String(item)))
          }
        }
      } else {
        // 单个子元素
        if (childDef.contentType === 'element' && value instanceof OoxmlElement) {
          children.push(value.toXml())
        } else if (childDef.contentType === 'text' || childDef.contentType === 'number') {
          children.push(createTextElement(childDef.xmlName, String(value)))
        }
      }
    }

    // --- 追加未建模的子元素（roundtrip 保真） ---
    for (const unmodeledChild of this._unmodeledChildren) {
      children.push(unmodeledChild)
    }

    // 组装最终对象
    const result: XmlElement = {
      [schema.tag]: children,
    }

    // 只有有属性时才添加 :@ key
    if (Object.keys(attrs).length > 0) {
      result[':@'] = attrs
    }

    return result
  }

  /**
   * 获取属性值的便捷方法
   */
  get(fieldName: string): any {
    return this.data[fieldName]
  }

  /**
   * 设置属性值的便捷方法
   */
  set(fieldName: string, value: any): this {
    this.data[fieldName] = value
    return this
  }
}

// ============================================================
// 内部辅助函数
// ============================================================

/** 解析属性原始字符串值为目标类型 */
function parseAttrValue(rawValue: string | undefined, attrDef: AttrDef): any {
  if (rawValue === undefined || rawValue === null) {
    return attrDef.defaultValue
  }

  switch (attrDef.type) {
    case 'string':
      return rawValue
    case 'number':
      return Number(rawValue)
    case 'boolean':
      return rawValue === 'true' || rawValue === '1'
    case 'onoff':
      return parseOnOff(rawValue)
    default:
      return rawValue
  }
}

/** 序列化属性值为 XML 字符串 */
function serializeAttrValue(value: any, attrDef: AttrDef): string | undefined {
  if (value === undefined || value === null) {
    if (attrDef.required) {
      return attrDef.defaultValue !== undefined ? String(attrDef.defaultValue) : undefined
    }
    return undefined
  }

  switch (attrDef.type) {
    case 'string':
      return String(value)
    case 'number':
      return String(value)
    case 'boolean':
      return value ? 'true' : 'false'
    case 'onoff':
      return toOnOff(value as boolean)
    default:
      return String(value)
  }
}

/** 创建包含文本内容的 preserveOrder 子元素 */
function createTextElement(tagName: string, text: string): XmlElement {
  return {
    [tagName]: [{ '#text': text }],
  }
}
