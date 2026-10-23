import{$i as e,Bi as t,C as n,Di as r,Fi as i,Gi as a,Hi as o,Ii as s,Ki as c,Li as l,Mi as u,Oi as d,Qi as f,Ra as p,Ri as m,S as h,Si as g,T as _,Ui as v,Vi as y,Wi as b,Xi as x,Zi as S,_ as C,_i as w,a as T,c as E,ca as D,d as O,da as k,ea as A,g as j,h as M,i as N,ia as P,ka as F,ki as ee,l as I,la as te,na as L,oa as R,p as z,qi as B,ra as V,s as H,ta as U,ua as W,vi as G,w as K,x as q,yi as J,zi as Y}from"./wordmark-DQwz3EdU.js";var X=!1;function Z(){if(X)return;X=!0;let e=document.createElement(`style`);e.textContent=`
.pcg-overlay {
  position: fixed; top: 12px; left: 12px; z-index: 10;
  /* Stops SHORT OF THE BOTTOM, not 12px from it: the wordmark sits in this
     corner (see shared/wordmark.ts) and a panel long enough to reach the
     floor lands on top of it. 45px is the mark's 13, its own 12 of margin,
     the panel's 12 at the top, and 8 of air between the two. Every page
     that builds this overlay draws that mark, so there is no case where
     this reserves space for nothing. */
  /* The bar this panel scrolls on is not styled here: the two scrollbar
     properties inherit, and tokens.css declares both on :root for every
     scrolling surface at once. See it for why they are the whole
     treatment. (No backticks in this comment, or in any other in this
     string: the whole stylesheet is one template literal.) */
  width: 300px; max-height: calc(100vh - 45px); overflow-y: auto;
  padding: 14px 16px; box-sizing: border-box;
  background: var(--ed-panel);
  border: 1px solid var(--ed-rule); border-radius: var(--ed-radius-lg);
  color: var(--ed-ink); font: 13px/1.45 system-ui, sans-serif;
  backdrop-filter: blur(6px);
}
.pcg-overlay h1 { margin: 0 0 2px; font-size: 15px; font-weight: 600; color: var(--ed-ink-hi); }
.pcg-overlay .pcg-info { margin: 0 0 10px; color: var(--ed-ink-dim); font-size: 12px; }
.pcg-overlay .pcg-row { display: flex; align-items: center; gap: 8px; margin: 7px 0; }
/* The flex above outranks the UA's [hidden] rule; a page hides a row with the hidden attribute. */
.pcg-overlay .pcg-row[hidden] { display: none; }
.pcg-overlay .pcg-row > label { flex: 0 0 96px; color: var(--ed-ink-mid); font-size: 12px; }
/* The slider: a solid bar filled to its value, and no thumb. Kept
   character for character in step with the same rule in
   shared/Controls.svelte — the two panels are one look built twice, this
   one in plain DOM and that one in Svelte, and a slider that differs
   between the demos and the editor is the seam showing. Both layers are
   painted on the input and both engine tracks are blanked, because
   neither engine's own parts can express a fill both of them draw:
   Firefox has ::-moz-range-progress and Chrome has nothing like it. The
   width comes from --p, set per element in addSlider. */
.pcg-overlay input[type="range"] {
  -webkit-appearance: none; appearance: none;
  flex: 1; min-width: 0; height: 16px; margin: 0;
  background-color: transparent;
  background-image:
    linear-gradient(var(--ed-slider-fill), var(--ed-slider-fill)),
    linear-gradient(var(--ed-slider-track), var(--ed-slider-track));
  background-repeat: no-repeat;
  background-position: left center, left center;
  background-size: var(--p, 0%) 8px, 100% 8px;
  cursor: ew-resize;
}
.pcg-overlay input[type="range"]::-webkit-slider-runnable-track { height: 100%; background: none; border: 0; }
.pcg-overlay input[type="range"]::-moz-range-track { height: 100%; background: none; border: 0; }
/* Transparent and one pixel wide rather than absent: a zero-width thumb
   loses the grab target on WebKit and display:none takes the drag with
   it. What the eye follows is the edge of the fill, which is where the
   thumb still is. */
.pcg-overlay input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 1px; height: 8px; margin-top: 4px;
  border: 0; border-radius: 0; background: transparent;
}
.pcg-overlay input[type="range"]::-moz-range-thumb {
  width: 1px; height: 8px; border: 0; border-radius: 0; background: transparent;
}
/* The default ring follows the thumb, which is now invisible and a pixel
   wide, so it goes around the whole track instead. */
.pcg-overlay input[type="range"]:focus { outline: none; }
.pcg-overlay input[type="range"]:focus-visible { outline: 1px solid var(--ed-focus); outline-offset: 3px; }
.pcg-overlay input[type="range"]:hover { filter: brightness(1.45); }
/* The number field and its stepper, kept in step with
   shared/NumberBox.svelte: minus and plus, square, the full height of
   the field, at its right edge, shown on hover. One look built twice for
   the same reason the slider is — this panel is plain DOM and that one
   is Svelte. The platform spinner cannot be reshaped into this (one box
   for both arrows on WebKit, nothing at all on Firefox), so it is hidden
   and replaced rather than restyled. */
.pcg-overlay .pcg-numbox { position: relative; display: inline-flex; width: 90px; }
.pcg-overlay input[type="number"] {
  width: 100%; padding: 3px 6px; box-sizing: border-box;
  background: var(--ed-well); color: var(--ed-ink); border: 1px solid var(--ed-edge); border-radius: var(--ed-radius);
  font: 12px ui-monospace, monospace;
}
.pcg-overlay input[type="number"]::-webkit-outer-spin-button,
.pcg-overlay input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.pcg-overlay input[type="number"] { -moz-appearance: textfield; appearance: textfield; }
.pcg-overlay .pcg-steps {
  position: absolute; top: 1px; right: 1px; bottom: 1px;
  display: flex; opacity: 0; pointer-events: none; transition: opacity 0.08s;
}
.pcg-overlay .pcg-numbox:hover .pcg-steps,
.pcg-overlay .pcg-numbox:focus-within .pcg-steps { opacity: 1; pointer-events: auto; }
.pcg-overlay .pcg-steps button {
  height: 100%; aspect-ratio: 1; padding: 0;
  display: grid; place-items: center;
  background: transparent; color: var(--ed-ink-mid);
  border: 0; border-radius: 0;
  font: 12px system-ui, sans-serif; line-height: 1; cursor: pointer; user-select: none;
}
/* At rest only the glyph: the field already has a border, and a plate
   inside it would be a second frame four pixels from the first. The
   fill arrives under the pointer, where it says which one you will hit. */
.pcg-overlay .pcg-steps button:hover { background: var(--ed-raised-hi); color: var(--ed-ink-hi); }
.pcg-overlay .pcg-steps button:active { background: var(--ed-edge); }
/* min-width: 0 is the load-bearing half of this rule, and the reason the
   panel had a horizontal scrollbar until 2026-08-29. A flex item's
   automatic minimum is its MIN-CONTENT width, and a select's min-content
   is its longest OPTION — not its selected one — so one long option in a
   list the row never shows at rest pushes the select past the panel's
   inner edge. The panel scrolls vertically, and per the overflow spec a
   visible overflow-x beside a non-visible overflow-y computes to auto:
   the bar appears with nothing visibly out of place to explain it. Its
   Svelte twin in shared/Controls.svelte carries the same declaration for
   the same reason; keep the two in step — this bug WAS the two drifting
   apart. This bounds the damage but does not do the caller's job: a
   label wider than the row now CLIPS instead of overflowing. At the
   300px width the row leaves the select 162px, and an option's padding,
   border and arrow eat ~34 of that, so the text itself has about 129px
   — roughly 20 characters of the 12px UI font. */
.pcg-overlay select {
  flex: 1; min-width: 0; padding: 3px 6px; background: var(--ed-well); color: var(--ed-ink);
  border: 1px solid var(--ed-edge); border-radius: var(--ed-radius); font: 12px system-ui, sans-serif;
}
.pcg-overlay input[type="checkbox"] { accent-color: var(--ed-accent); }
.pcg-overlay .pcg-val { flex: 0 0 44px; text-align: right; color: var(--ed-figure); font: 12px ui-monospace, monospace; }
.pcg-overlay .pcg-stats { margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--ed-rule); }
/* Flex items default to min-width:auto, so a long value used to overrun the
   label. Wrap the row instead: when the pair does not fit, the value drops to
   its own right-aligned line rather than breaking "105.0 KiB" mid-number or
   clipping the label. */
.pcg-overlay .pcg-stat { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 0 10px; margin: 2px 0; }
.pcg-overlay .pcg-stat span:first-child { color: var(--ed-ink-dim); font-size: 12px; flex: 0 1 auto; min-width: 0; }
.pcg-overlay .pcg-stat span:last-child { color: var(--ed-figure); font: 12px ui-monospace, monospace; flex: 0 1 auto; margin-left: auto; min-width: 0; text-align: right; overflow-wrap: anywhere; }
.pcg-overlay details { margin-top: 10px; border-top: 1px solid var(--ed-rule); padding-top: 8px; }
.pcg-overlay summary { cursor: pointer; color: var(--ed-ink-mid); font-size: 12px; user-select: none; }
.pcg-overlay pre {
  margin: 8px 0 0; padding: 8px; max-height: 260px; overflow: auto;
  background: var(--ed-well); border: 1px solid var(--ed-rule); border-radius: var(--ed-radius);
  color: var(--ed-ink-mid); font: 11px/1.5 ui-monospace, monospace; white-space: pre;
}
.pcg-overlay .pcg-note { margin-top: 8px; color: var(--ed-ink-faint); font-size: 11px; }
/* A section the overlay does not draw itself. Same rule and spacing as
   .pcg-stats, so whatever fills it reads as part of the panel rather than as
   something sitting on top of it. */
.pcg-overlay .pcg-slot { margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--ed-rule); }
/* A slot its tenant never filled (a tool that did not load, a feature the
   page's depth leaves off) draws nothing, rather than a rule and a gap. */
.pcg-overlay .pcg-slot:empty { display: none; }
/* A slot at the top sits between the caption and the controls. It draws
   no rule of its own: what fills it frames itself, as a section. */
.pcg-overlay .pcg-slot-top { margin: 12px 0 12px; padding: 0; border-top: 0; }
/* The chevron only exists for the bottom-sheet layout below; on desktop the
   title is not a toggle, so the glyph stays hidden. */
.pcg-overlay .pcg-chevron { display: none; }
/* Below the shared breakpoint the panel becomes a full-width bottom sheet so
   the 3D content keeps the screen. Collapse is a max-height clip rather than
   display:none: the capture tooling scrapes .pcg-stat textContent for
   readiness, so the stat rows must stay in the DOM. */
@media ${N} {
  .pcg-overlay {
    top: auto; left: 0; right: 0; bottom: 0;
    width: auto; z-index: 12;
    max-height: 50vh;   /* fallback for pre-dvh browsers */
    max-height: 50dvh;
    border-radius: var(--ed-radius-lg) var(--ed-radius-lg) 0 0;
    border-width: 1px 0 0 0;
    padding: 0 16px calc(10px + env(safe-area-inset-bottom));
    transition: max-height 0.25s ease;
    overscroll-behavior: contain;
  }
  .pcg-overlay h1 {
    position: sticky; top: 0; z-index: 1;
    margin: 0 -16px;                    /* full-bleed tap target */
    padding: 13px 16px;
    line-height: 22px;                  /* bar height: 22 + 2*13 = 48px */
    background: var(--ed-solid); /* content scrolls under the sticky bar */
    cursor: pointer;
  }
  .pcg-overlay .pcg-chevron { display: inline-block; float: right; color: var(--ed-ink-dim); transition: transform 0.2s; }
  .pcg-overlay.pcg-collapsed { max-height: calc(48px + env(safe-area-inset-bottom)); overflow: hidden; }
  .pcg-overlay.pcg-collapsed .pcg-chevron { transform: rotate(180deg); }
}
`,document.head.appendChild(e)}function Q(e){Z(),document.addEventListener(`contextmenu`,e=>{e.target?.closest(`input, textarea, [contenteditable]`)??e.preventDefault()});let t=document.createElement(`div`);t.className=`pcg-overlay`;let n=document.createElement(`h1`);n.textContent=e.title;let r=document.createElement(`span`);r.className=`pcg-chevron`,r.textContent=`▾`,n.appendChild(r),t.appendChild(n),n.setAttribute(`role`,`button`),n.tabIndex=0;let i=()=>{n.setAttribute(`aria-expanded`,String(!t.classList.contains(`pcg-collapsed`)))},a=()=>{t.classList.toggle(`pcg-collapsed`),i()};n.addEventListener(`click`,a),n.addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),a())});let o=T();if(o.matches&&t.classList.add(`pcg-collapsed`),o.addEventListener(`change`,e=>{t.classList.toggle(`pcg-collapsed`,e.matches),i()}),i(),e.info){let n=document.createElement(`p`);n.className=`pcg-info`,n.textContent=e.info,t.appendChild(n)}let s=document.createElement(`div`);t.appendChild(s);let c=document.createElement(e.foldStats?`details`:`div`);if(c.className=`pcg-stats`,e.foldStats){let e=document.createElement(`summary`);e.textContent=`Stats`,c.appendChild(e)}t.appendChild(c),document.body.appendChild(t);function l(e){let t=document.createElement(`div`);t.className=`pcg-row`;let n=document.createElement(`label`);return n.textContent=e,t.appendChild(n),s.appendChild(t),t}function u(e,t){let n=document.createElement(`span`);n.className=`pcg-numbox`,n.appendChild(e);let r=document.createElement(`span`);r.className=`pcg-steps`;for(let[n,i,a]of[[-1,`−`,`Decrease`],[1,`+`,`Increase`]]){let o=document.createElement(`button`);o.type=`button`,o.tabIndex=-1,o.textContent=i,o.setAttribute(`aria-label`,a);let s,c,l=()=>{n>0?e.stepUp():e.stepDown(),t()},u=()=>{clearTimeout(s),clearInterval(c)};o.addEventListener(`pointerdown`,e=>{e.preventDefault(),l(),s=setTimeout(()=>{c=setInterval(l,60)},400)});for(let e of[`pointerup`,`pointerleave`,`pointercancel`])o.addEventListener(e,u);r.appendChild(o)}return n.appendChild(r),n}return{el:t,addSeed(e,t){let n=l(`Seed`),r=document.createElement(`input`);r.type=`number`,r.step=`1`,r.min=`0`,r.value=String(e);let i=()=>{let e=Math.floor(r.valueAsNumber);Number.isFinite(e)&&t(e>>>0)};r.addEventListener(`change`,i),n.appendChild(u(r,i))},addSlider(e,t,n){let r=l(e),i=document.createElement(`input`);i.type=`range`,i.min=String(t.min),i.max=String(t.max),i.step=String(t.step),i.value=String(t.value);let a=document.createElement(`span`);a.className=`pcg-val`;let o=t.format??(e=>String(e));a.textContent=o(t.value);let s=e=>{let n=t.max-t.min,r=n>0?(e-t.min)/n:0;i.style.setProperty(`--p`,`${Math.min(1,Math.max(0,r))*100}%`)};return s(t.value),i.addEventListener(`input`,()=>{let e=Number(i.value);a.textContent=o(e),s(e),n(e)}),r.appendChild(i),r.appendChild(a),r},addSelect(e,t,n,r){let i=l(e),a=document.createElement(`select`);for(let e of t){let t=document.createElement(`option`);t.value=e.value,t.textContent=e.label,a.appendChild(t)}a.value=n,a.addEventListener(`change`,()=>r(a.value)),i.appendChild(a)},addCheckbox(e,t,n){let r=l(e),i=document.createElement(`input`);return i.type=`checkbox`,i.checked=t,i.addEventListener(`change`,()=>n(i.checked)),r.appendChild(i),i},addStat(e){let t=document.createElement(`div`);t.className=`pcg-stat`;let n=document.createElement(`span`);n.textContent=e;let r=document.createElement(`span`);return r.textContent=`–`,t.appendChild(n),t.appendChild(r),c.appendChild(t),e=>{r.textContent=String(e)}},addCollapsible(e,n=!1){let r=document.createElement(`details`);r.open=n;let i=document.createElement(`summary`);i.textContent=e,r.appendChild(i);let a=document.createElement(`pre`);return r.appendChild(a),t.appendChild(r),a},addNote(e){let n=document.createElement(`p`);n.className=`pcg-note`,n.textContent=e,t.appendChild(n)},addSlot(e=`bottom`){let n=document.createElement(`div`);return n.className=e===`top`?`pcg-slot pcg-slot-top`:`pcg-slot`,e===`top`?t.insertBefore(n,s):e===`controls`?s.appendChild(n):t.appendChild(n),n}}}var ne=o(`<path class="edge-casing svelte-v559t8"></path><path></path>`,1),re=o(`<svg role="img"><g><!><!></g></svg>`);function $(n,o){te(o,!0);let s=G(o,`previews`,19,()=>new Map),l=G(o,`interactive`,3,!0),p=G(o,`label`,3,`Node graph`),m=P(void 0),h=P(L({x:0,y:0,z:1})),_=null,v=R(()=>new Map([...s()].map(([e,t])=>[e,t.length]))),y=R(()=>new Map(o.nodes.map(e=>[e.id,e])));function b(e,t){return o.floor??j(e,t)}function w(){if(!B(m))return;let e=B(m).getBoundingClientRect();if(e.width===0||e.height===0)return;let t=O(o.nodes,B(v));V(h,z(t,e,{floor:b(t,e),preferActual:l()}),!0)}function T(){if(!B(m))return;let e=O(o.nodes,B(v));V(h,e===null?{x:0,y:0,z:1}:I(1,e,B(m).getBoundingClientRect()),!0)}S(()=>{o.nodes,o.floor,l(),w()}),S(()=>{let e=B(m);if(!e)return;let t=new ResizeObserver(()=>w());return t.observe(e),()=>t.disconnect()});function N(e){if(!l()||!B(m))return;e.preventDefault();let t=B(m).getBoundingClientRect(),n=b(O(o.nodes,B(v)),t);V(h,M(B(h),t,e.clientX,e.clientY,e.deltaY,n),!0)}function F(e){!l()||e.button!==0||(_={px:e.clientX,py:e.clientY,ox:B(h).x,oy:B(h).y},B(m)?.setPointerCapture(e.pointerId))}function ee(e){_&&V(h,{...B(h),x:_.ox+(e.clientX-_.px),y:_.oy+(e.clientY-_.py)},!0)}function W(){_=null}function K(){l()&&w()}var q={fit:w,actualSize:T},X=re();c(`pointermove`,f,ee),c(`pointerup`,f,W);let Z;var Q=e(X),$=e(Q);u($,17,()=>o.edges,e=>`${e.from}.${e.fromPin}->${e.to}.${e.toPin}`,(e,n)=>{let r=R(()=>E(B(y),B(n)));var a=t(),o=A(a),s=e=>{var t=ne(),i=A(t),a=U(i);x(e=>{g(i,`d`,B(r)),d(a,0,`edge-line k-${e??``}`,`svelte-v559t8`),g(a,`d`,B(r))},[()=>H(B(y),B(n))]),Y(e,t)};i(o,e=>{B(r)&&e(s)}),Y(e,a)});var ie=U($);return u(ie,17,()=>o.nodes,e=>e.id,(e,t)=>{{let n=R(()=>s().get(B(t).id));C(e,{get node(){return B(t)},get params(){return B(n)}})}}),k(Q),k(X),J(X,e=>V(m,e),()=>B(m)),x(e=>{Z=d(X,0,`view svelte-v559t8`,null,Z,{interactive:l()}),g(X,`aria-label`,p()),g(Q,`transform`,`translate(${B(h).x??``} ${B(h).y??``}) scale(${B(h).z??``})`),r(Q,`--hairline: ${e??``}`)},[()=>Math.max(1,1/B(h).z)]),c(`wheel`,X,N),a(`pointerdown`,X,F),a(`dblclick`,X,K),Y(n,X),D(q)}b([`pointerdown`,`dblclick`]);function ie(e){let t=e.parentNode;return document.body.appendChild(e),{destroy(){t&&e.parentNode===document.body&&t.appendChild(e),e.remove()}}}function ae(e){return typeof e==`object`&&!!e&&!Array.isArray(e)&&`fn`in e}function oe(e){if(ae(e))try{return`ƒ ${p(e).replace(/\s+/g,` `)}`}catch{return`ƒ`}return typeof e==`number`?q(e):typeof e==`boolean`?String(e):typeof e==`string`?e===``?`–`:e:Array.isArray(e)?e.length===0?`–`:e.map(e=>typeof e==`number`?q(e):String(e)).join(`, `):e==null?`–`:`…`}function se(e){let t=e.subgraph;if(t===void 0)return;let n=t.inputs.map(e=>e.name),r=t.outputs.map(e=>e.name);if(e.type===`applyRules`){let e=new Set(r);return{inputs:[`in`,...n.filter(t=>!e.has(t))],outputs:[`out`,`trail`,`rounds`,`converged`]}}return e.type===`repeatUntil`?{inputs:n,outputs:[...r,`rounds`,`converged`]}:{inputs:n,outputs:r}}function ce(e,t){let r;try{r=n(e.type)}catch{r=void 0}let i=e.subgraph!==void 0||e.ref!==void 0;if(r!==void 0&&!i)return r;let a=se(e),o=(e,t)=>[...new Set([...e,...t??[]])].map(e=>({name:e,kind:`any`,multi:!1}));return{inputs:o(a?.inputs??[],t.inputs.get(e.id)),outputs:o(a?.outputs??[],t.outputs.get(e.id))}}function le(e){let t=new Map,n=new Map,r=(e,t,n)=>{let r=e.get(t);r||e.set(t,r=new Set),r.add(n)};for(let i of e.connections??[])r(n,i.from[0],i.from[1]),r(t,i.to[0],i.to[1]);for(let t of e.outputs??[])r(n,t.id,t.pin);return{inputs:t,outputs:n}}function ue(e){let t=le(e),n=new Map,r=e.nodes.map(e=>{let r=ce(e,t),i=h(e.type),a=Object.entries(e.params).map(([e,t])=>({key:e,value:oe(t),field:ae(t)}));return n.set(e.id,K(a)),{id:e.id,type:e.type,...e.ref===void 0?{}:{label:e.ref.name},...i===void 0?{}:{category:i},x:0,y:0,inputs:r.inputs,outputs:r.outputs}}),i=(e.connections??[]).map(e=>({from:e.from[0],fromPin:e.from[1],to:e.to[0],toPin:e.to[1]}));return _(r,i,new Map([...n].map(([e,t])=>[e,t.length]))),{nodes:r,edges:i,previews:n}}var de=y(`<button type="button" role="tab"> </button>`),fe=y(`<div class="tabs svelte-ul999b" role="tablist" aria-label="Graphs"></div>`),pe=y(`<span class="heading svelte-ul999b"> </span>`),me=y(`<p class="empty svelte-ul999b">This graph could not be laid out.</p>`),he=y(`<div class="backdrop svelte-ul999b" role="presentation"><div class="sheet svelte-ul999b" role="dialog" aria-modal="true"><header class="svelte-ul999b"><!> <span class="meta svelte-ul999b"><!></span> <button class="close svelte-ul999b" type="button" aria-label="Close">✕</button></header> <div class="body svelte-ul999b"><!></div> <footer class="svelte-ul999b">Scroll to zoom · drag to pan · double-click to fit · read-only</footer></div></div>`),ge=y(`<div class="pcg-graph-panel svelte-ul999b"><button class="thumb svelte-ul999b" type="button"><span class="cap svelte-ul999b"><span class="name svelte-ul999b"> </span> <span class="count svelte-ul999b"><!></span></span> <span class="frame svelte-ul999b"><!></span></button></div> <!>`,1);function _e(t,n){te(n,!0);let r=G(n,`title`,3,`Graph`),o=P(L(n.initial)),s=P(!1),p=P(0);function m(e){V(o,e,!0),B(p)>=e.length&&V(p,0),b()}let h=P(L([])),_=R(()=>B(h)[Math.min(B(p),B(h).length-1)]??null),y=R(()=>B(o)[Math.min(B(p),B(o).length-1)]?.name??``);function b(){V(h,B(o).map(e=>{try{return ue(e.json)}catch{return null}}),!0)}w(b);function S(e){e.key===`Escape`&&B(s)&&(e.preventDefault(),V(s,!1))}var C={setGraphs:m},T=ge();c(`keydown`,f,S);var E=A(T),O=e(E),j=e(O),M=e(j),N=e(M,!0);k(M);var F=U(M,2),I=e(F),z=e=>{var t=v();x(()=>l(t,`${B(_).nodes.length??``} nodes`)),Y(e,t)},H=e=>{var t=v(`…`);Y(e,t)};i(I,e=>{B(_)?e(z):e(H,-1)}),k(F),k(j);var K=U(j,2),q=e(K),J=e=>{$(e,{get nodes(){return B(_).nodes},get edges(){return B(_).edges},get previews(){return B(_).previews},interactive:!1,floor:.09,get label(){return`${B(y)??``} graph, thumbnail`}})};i(q,e=>{B(_)&&e(J)}),k(K),k(O),k(E);var X=U(E,2),Z=t=>{var n=he(),r=e(n),c=e(r),f=e(c),m=t=>{var n=fe();u(n,23,()=>B(o),e=>e.name,(t,n,r)=>{var i=de();let o;var s=e(i,!0);k(i),x(()=>{g(i,`aria-selected`,B(r)===B(p)),o=d(i,1,`svelte-ul999b`,null,o,{on:B(r)===B(p)}),l(s,B(n).name)}),a(`click`,i,()=>V(p,B(r),!0)),Y(t,i)}),k(n),Y(t,n)},h=t=>{var n=pe(),r=e(n,!0);k(n),x(()=>l(r,B(y))),Y(t,n)};i(f,e=>{B(o).length>1?e(m):e(h,-1)});var b=U(f,2),S=e(b),C=e=>{var t=v();x(()=>l(t,`${B(_).nodes.length??``} nodes · ${B(_).edges.length??``} connections`)),Y(e,t)};i(S,e=>{B(_)&&e(C)}),k(b);var w=U(b,2);k(c);var T=U(c,2),E=e(T),D=e=>{$(e,{get nodes(){return B(_).nodes},get edges(){return B(_).edges},get previews(){return B(_).previews},get label(){return`${B(y)??``} graph`}})},O=e=>{var t=me();Y(e,t)};i(E,e=>{B(_)?e(D):e(O,-1)}),k(T),W(2),k(r),k(n),ee(n,e=>ie?.(e)),x(()=>g(r,`aria-label`,`${B(y)??``} graph`)),a(`pointerdown`,n,e=>e.target===e.currentTarget&&V(s,!1)),a(`click`,w,()=>V(s,!1)),Y(t,n)};return i(X,e=>{B(s)&&e(Z)}),x(()=>{g(O,`aria-label`,`Show the ${(B(y)||r())??``} graph`),l(N,B(y)||r())}),a(`click`,O,()=>V(s,!0)),Y(t,T),D(C)}b([`click`,`pointerdown`]);function ve(e){let t=[];for(let n of e)try{t.push({name:n.name,json:F(n.graph)})}catch(e){console.warn(`graph panel: "${n.name}" could not be serialized, so it is not shown`,e)}return t}function ye(e,t){let n=document.createElement(`div`);t.into.appendChild(n);let r=s(_e,{target:n,props:{initial:ve(e),title:t.title??`Graph`}}),i=r;return{set(e){i.setGraphs(ve(e))},destroy(){m(r),n.remove()}}}export{Q as n,ye as t};