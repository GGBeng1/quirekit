import { readFlowLibrary } from "./format";
import type { FlowLibrary } from "./types";
import { v4 as uuidv4 } from "uuid";
/** @returns A portable empty library, without storage side effects. */
export function createFlowLibrary():FlowLibrary {return {format:"quirekit-flow-library",version:1,items:[]};}
/** @param current - Existing content. @param imported - Fully validated file. @param identity - Fresh identity source.
 * @returns Atomic append with independent identities; collisions and limits reject the entire import. */
export function appendFlowLibrary(current:FlowLibrary,imported:FlowLibrary,identity:()=>string=()=>uuidv4()):FlowLibrary {
  const source=readFlowLibrary(current),additions=readFlowLibrary(imported);
  return readFlowLibrary({...source,items:[...source.items,...additions.items.map(item=>({...item,id:identity()}))]});
}
