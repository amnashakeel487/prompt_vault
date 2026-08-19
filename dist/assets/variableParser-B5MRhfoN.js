import{c as r}from"./index-B4FMJIKb.js";/**
 * @license lucide-react v0.424.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=r("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-react v0.424.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=r("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.424.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=r("Flame",[["path",{d:"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",key:"96xj49"}]]),i=/\{\{\s*([a-zA-Z0-9_ ]+?)\s*\}\}/g;function d(e=""){const t=new Set,a=[];let n;const s=new RegExp(i);for(;(n=s.exec(e))!==null;){const c=n[1].trim();t.has(c)||(t.add(c),a.push(c))}return a}function m(e=""){const t=[];let a=0,n;const s=new RegExp(i);for(;(n=s.exec(e))!==null;)n.index>a&&t.push({type:"text",value:e.slice(a,n.index)}),t.push({type:"var",value:n[1].trim()}),a=n.index+n[0].length;return a<e.length&&t.push({type:"text",value:e.slice(a)}),t}function x(e="",t={}){return e.replace(i,(a,n)=>{const s=n.trim(),c=t[s];return c&&c.trim().length>0?c:`{{${s}}}`})}function y(e=""){return Math.max(1,Math.round(e.length/4))}function p(e=""){const t=e.trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(t/200))}export{l as C,h as E,u as F,y as a,d as e,x as g,p as r,m as t};
