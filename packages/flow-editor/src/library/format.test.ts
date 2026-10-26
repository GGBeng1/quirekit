import { expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "@quirekit/flowchart";
import { parseFlowLibrary, readFlowLibrary, serializeFlowLibrary } from "./format";
import { appendFlowLibrary } from "./operations";
const item = { id: "one", name: "组件", kind: "component", document: {...createFlowchart(),revision:7,nodes:[createFlowchartNode("a","note",{x:0,y:0},"文字")] } };
const library = { format:"quirekit-flow-library",version:1,items:[item] };
it("round trips canonical source, normalizes host revision and preserves safe literal names",()=>{
  const source=readFlowLibrary(library);expect(source.items[0]!.document.revision).toBe(0);
  expect(parseFlowLibrary(serializeFlowLibrary(source))).toEqual(source);
  expect(readFlowLibrary({...library,items:[{...item,name:'<script> & 中文'}]}).items[0]!.name).toBe('<script> & 中文');
});
it("rejects unknown fields, bad sources, identities, empty components and bounded input",()=>{
  for(const value of [{...library,html:'<svg/>'},{...library,version:2},{...library,items:[item,item]}, {...library,items:[{...item,preview:'javascript:alert(1)'}]}, {...library,items:[{...item,document:createFlowchart()}]}, {...library,items:[{...item,name:' '.repeat(81)}]}, {...library,items:Array.from({length:101},(_,i)=>({...item,id:`n${i}`}))}])expect(()=>readFlowLibrary(value)).toThrow();
  expect(()=>parseFlowLibrary(' '.repeat(8000001))).toThrow();
  expect(()=>readFlowLibrary({...library,items:[{...item,document:{...item.document,nodes:[{...item.document.nodes[0],rotation:360}]}}]})).toThrow();
});
it("appends imports with new identities and never overwrites an existing item",()=>{
  const source=readFlowLibrary(library);let id=0;
  const next=appendFlowLibrary(source,source,()=>`copy-${id++}`);expect(next.items.map(i=>i.id)).toEqual(['one','copy-0']);expect(source.items).toHaveLength(1);
  expect(()=>appendFlowLibrary(source,source,()=>"one")).toThrow();
});
