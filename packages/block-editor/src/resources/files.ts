import { blockEditorText } from "../localization/node-view";
import { v4 } from "uuid";
import type { Editor } from "@quirekit/core";
import type { BlockResource, BlockRichContentOptions } from "../rich-content/types";
import { validResources } from "./model";
/** @param editor - Feature owner. @returns Installed host adapter and file budget. */
export function richContentOptions(editor: Editor): BlockRichContentOptions {
  return editor.extensions.find(extension => extension.name === "blockRichContent")?.options as BlockRichContentOptions ?? {maxFileSize:4*1024*1024};
}
/** @param file - File to persist. @param signal - Task lifetime. @param progress - Bounded file percentage. @returns Portable inline asset. */
function readInline(file: File, signal: AbortSignal, progress: (percent:number)=>void): Promise<BlockResource> {
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    /** Revokes native file reading when its editor task ends. */
    const abort = (): void => { reader.abort(); reject(new DOMException("Cancelled","AbortError")); };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort",abort,{once:true});
    reader.onprogress = event => { if(event.lengthComputable) progress(Math.round(event.loaded/event.total*100)); };
    reader.onerror = () => reject(new Error("文件读取失败，请重试"));
    reader.onabort = () => reject(new DOMException("Cancelled","AbortError"));
    reader.onloadend = () => signal.removeEventListener("abort",abort);
    reader.onload = () => {
      const mime = file.type || "application/octet-stream";
      const src = String(reader.result).replace(/^data:[^;]*;/u,`data:${mime};`);
      resolve({id:v4(),src,name:file.name,mime,size:file.size});
    };
    reader.readAsDataURL(file);
  });
}
/** @param editor - Storage adapter owner. @param files - Accepted local files. @param signal - Draft lifetime. @param progress - Batch percentage. @returns Ready resources, never blob URLs. */
export async function storeBlockFiles(editor: Editor, files: readonly File[], signal: AbortSignal, progress: (percent:number)=>void): Promise<BlockResource[]> {
  const options=richContentOptions(editor), result:BlockResource[]=[];
  for (let i=0;i<files.length;i++) {
    const file=files[i]!;
    if (signal.aborted) throw new DOMException("Cancelled","AbortError");
    if (file.size>options.maxFileSize) throw new Error(blockEditorText(editor, "“{name}”超过文件大小限制", { name: file.name }));
    const report=(value:number):void=>progress(Math.round((i+Math.max(0,Math.min(100,value))/100)/files.length*100));
    const resource=await (options.storeFile ? options.storeFile(file,signal,report) : readInline(file,signal,report));
    if (signal.aborted) throw new DOMException("Cancelled","AbortError");
    if (!validResources([resource])) throw new Error("存储服务未返回可保存的资源地址");
    result.push({...resource,id:v4()}); report(100);
  }
  return result;
}
