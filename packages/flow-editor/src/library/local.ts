import { flowLibraryLimit, readFlowLibrary, readFlowLibrarySnapshot } from "./format";
import { createFlowLibrary } from "./operations";
import type { FlowLibrarySnapshot, FlowLibraryStore } from "./types";
import { v4 as uuidv4 } from "uuid";
const key="quirekit-flow-library-v1", eventName="quirekit-flow-library-change";
/** @param owner - Storage and event realm. @returns Same-origin, lock-protected store; construction performs no storage access. */
export function createLocalFlowLibraryStore(owner:Window):FlowLibraryStore {
  /** @returns Current validated snapshot; corruption never falls back to overwriting an empty library. */
  function read():FlowLibrarySnapshot {
    const text=owner.localStorage.getItem(key);
    if(text===null)return {revision:"empty",library:createFlowLibrary()};
    if(text.length>flowLibraryLimit+500)throw new RangeError("本机图形库超过容量限制");
    return readFlowLibrarySnapshot(JSON.parse(text));
  }
  return {
    /** @param signal - Caller lifetime. @returns Current detached content. */
    async read(signal){signal.throwIfAborted();return read();},
    /** @param library - New library. @param expectedRevision - Original token. @param signal - Caller lifetime. @returns Atomically committed version. */
    async write(library,expectedRevision,signal){
      signal.throwIfAborted();const content=readFlowLibrary(library),locks=owner.navigator.locks;
      if(!locks)throw new Error("此浏览器无法协调本机图形库写入，请使用支持 Web Locks 的浏览器或共享存储服务");
      return locks.request(key,{signal},()=>{
        signal.throwIfAborted();if(read().revision!==expectedRevision)throw new Error("图形库已在其他窗口更新，请刷新后重试");
        const snapshot={revision:uuidv4(),library:content};
        owner.localStorage.setItem(key,JSON.stringify(snapshot));
        owner.dispatchEvent(new Event(eventName));return readFlowLibrarySnapshot(snapshot);
      });
    },
    /** @param listener - Content invalidation only. @returns Cleanup for this mounted consumer. */
    subscribe(listener){
      /** @param event - Same-origin storage mutation. */
      function changed(event:StorageEvent):void {if(event.storageArea===owner.localStorage&&(event.key===key||event.key===null))listener();}
      owner.addEventListener("storage",changed);owner.addEventListener(eventName,listener);
      return ()=>{owner.removeEventListener("storage",changed);owner.removeEventListener(eventName,listener);};
    },
  };
}
