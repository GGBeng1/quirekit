// @vitest-environment happy-dom
import {beforeEach,expect,it,vi} from "vitest";
import {createFlowchart} from "@quirekit/flowchart";
import {createLocalFlowLibraryStore} from "./local";
import {createFlowLibrary} from "./operations";
const signal=new AbortController().signal;
beforeEach(()=>{localStorage.clear();let queue=Promise.resolve();Object.defineProperty(navigator,"locks",{configurable:true,value:{request:(_name:string,_options:unknown,run:()=>unknown)=>{const result=queue.then(run);queue=result.then(()=>{},()=>{});return result;}}});});
it("serializes concurrent writers, broadcasts once and preserves the winner",async()=>{
  const a=createLocalFlowLibraryStore(window),b=createLocalFlowLibraryStore(window),base=await a.read(signal),changed=vi.fn(),release=b.subscribe(changed);
  const library={...createFlowLibrary(),items:[{id:"a",name:"空白模板",kind:"template" as const,document:createFlowchart()}]};
  const results=await Promise.allSettled([a.write(library,base.revision,signal),b.write(createFlowLibrary(),base.revision,signal)]);
  expect(results.map(r=>r.status)).toEqual(["fulfilled","rejected"]);expect((await b.read(signal)).library).toEqual(library);expect(changed).toHaveBeenCalledTimes(1);
  release();await b.write(createFlowLibrary(),(await b.read(signal)).revision,signal);expect(changed).toHaveBeenCalledTimes(1);
});
it("does not erase corrupt storage or write after cancellation/quota failure",async()=>{
  const store=createLocalFlowLibraryStore(window);localStorage.setItem("quirekit-flow-library-v1","broken");
  await expect(store.read(signal)).rejects.toThrow();await expect(store.write(createFlowLibrary(),"empty",signal)).rejects.toThrow();expect(localStorage.getItem("quirekit-flow-library-v1")).toBe("broken");
  localStorage.clear();const abort=new AbortController();abort.abort();await expect(store.write(createFlowLibrary(),"empty",abort.signal)).rejects.toThrow();expect(localStorage.length).toBe(0);
  const set=vi.spyOn(localStorage,"setItem").mockImplementation(()=>{throw new Error("quota");});await expect(store.write(createFlowLibrary(),"empty",signal)).rejects.toThrow("quota");expect(localStorage.length).toBe(0);set.mockRestore();
});
it("rejects unlocked storage writes instead of silently racing across tabs",async()=>{
  Object.defineProperty(navigator,"locks",{configurable:true,value:undefined});await expect(createLocalFlowLibraryStore(window).write(createFlowLibrary(),"empty",signal)).rejects.toThrow("Web Locks");
});
