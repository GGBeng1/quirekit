import { expect, it } from 'vitest';
import { filterCommandGroups } from './projection';
const groups = [{key:'a',label:'文档',items:[{key:'one',label:'新建文档',keywords:['Create document']},{key:'two',label:'新建文档',disabled:true,description:'模板'}]}, {key:'b',label:'视图',items:[{key:'dark',label:'暗色主题'}]}];
it('matches Chinese, case-insensitive keywords and all query terms without changing order',()=>{
  expect(filterCommandGroups(groups,'  CREATE 文档 ',true)[0]?.items.map(x=>x.key)).toEqual(['one']);
  expect(filterCommandGroups(groups,'新建',true)[0]?.items.map(x=>x.key)).toEqual(['one','two']);
  expect(filterCommandGroups(groups,'missing',true)).toEqual([]);
  expect(groups[0]?.items).toHaveLength(2);
});
it('preserves unavailable entries and host results without inventing empty groups',()=>{
  expect(filterCommandGroups(groups,'',true)).toEqual(groups);
  expect(filterCommandGroups(groups,'unmatched',false)).toEqual(groups);
  expect(filterCommandGroups([{key:'empty',label:'空',items:[]}],'',true)).toEqual([]);
});
