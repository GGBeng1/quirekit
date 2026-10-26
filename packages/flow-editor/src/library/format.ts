import { readFlowchart } from "@quirekit/flowchart";
import type { FlowLibrary, FlowLibraryItem, FlowLibrarySnapshot } from "./types";
export const flowLibraryLimit = 8000000;
/** @param value - External record. @param keys - Exact admitted fields. @returns Checked own-property record. */
function object(value: unknown, keys: readonly string[]): Record<string,unknown> {
  if (!value || typeof value!=="object" || Array.isArray(value) || Object.keys(value).some(key=>!keys.includes(key))) throw new TypeError("图形库格式无效");
  return value as Record<string,unknown>;
}
/** @param value - Proposed plain name. @returns Trimmed, bounded display name. */
export function flowLibraryName(value: unknown): string {
  if (typeof value!=="string" || !value.trim() || value.length>80 || /[\u0000-\u001f]/.test(value)) throw new TypeError("名称须为 1–80 个字符");
  return value.trim();
}
/** @param value - Untrusted decoded file. @returns Detached canonical library, with no external markup. */
export function readFlowLibrary(value: unknown): FlowLibrary {
  const source=object(value,["format","version","items"]);
  if(source.format!=="quirekit-flow-library"||source.version!==1||!Array.isArray(source.items)||source.items.length>100)throw new TypeError("图形库须为 v1 格式，最多保存 100 项");
  const ids=new Set<string>();let size=0;
  const items=source.items.map((raw):FlowLibraryItem=>{
    const item=object(raw,["id","name","kind","document"]);
    if(typeof item.id!=="string"||! /^[\w-]{1,100}$/.test(item.id)||ids.has(item.id))throw new TypeError("图形库项目身份无效或重复");
    ids.add(item.id);if(item.kind!=="template"&&item.kind!=="component")throw new TypeError("未知图形库项目类型");
    const rawSize=JSON.stringify(item.document)?.length ?? 0; size+=rawSize;
    if(rawSize>4000000||size>flowLibraryLimit)throw new RangeError("图形库内容超过容量限制");
    const document={...readFlowchart(item.document),revision:0};
    if(item.kind==="component"&&!document.nodes.length&&!document.edges.length)throw new TypeError("组件不能是空图");
    return {id:item.id,name:flowLibraryName(item.name),kind:item.kind,document};
  });
  const result:FlowLibrary={format:"quirekit-flow-library",version:1,items};
  if(JSON.stringify(result).length>flowLibraryLimit)throw new RangeError("图形库内容超过容量限制");
  return result;
}
/** @param text - Portable JSON, checked before parsing. @returns Validated library. */
export function parseFlowLibrary(text:string):FlowLibrary {
  if(text.length>flowLibraryLimit)throw new RangeError("图形库文件过大");return readFlowLibrary(JSON.parse(text));
}
/** @param value - Canonical records. @returns Portable JSON without storage metadata. */
export function serializeFlowLibrary(value:FlowLibrary):string {return JSON.stringify(readFlowLibrary(value));}
/** @param value - Custom-store response. @returns Validated detached snapshot. */
export function readFlowLibrarySnapshot(value:unknown):FlowLibrarySnapshot {
  const source=object(value,["revision","library"]);
  if(typeof source.revision!=="string"||!source.revision||source.revision.length>200)throw new TypeError("图形库存储版本无效");
  return {revision:source.revision,library:readFlowLibrary(source.library)};
}
