import{$i as e,Ai as t,Bi as n,C as r,Da as i,Di as a,Ei as o,Fa as s,Fi as c,Gi as l,Hi as u,Ii as d,Ji as f,Li as p,Ni as m,Pi as h,Qi as g,Ri as _,S as v,T as y,Ti as b,Ui as x,Vi as S,Wi as C,Xi as w,Yi as T,Zi as E,_ as D,_i as O,a as k,bi as A,c as j,ca as ee,d as M,ea as N,g as P,gi as F,h as I,hi as L,i as R,ia as z,l as te,la as B,na as V,oa as H,p as U,s as W,sa as G,ta as K,w as q,x as J,zi as Y}from"./wordmark-B7nR4seR.js";var X=!1;function Z(){if(X)return;X=!0;let e=document.createElement(`style`);e.textContent=`
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
@media ${R} {
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
`,document.head.appendChild(e)}function Q(e){Z(),document.addEventListener(`contextmenu`,e=>{e.target?.closest(`input, textarea, [contenteditable]`)??e.preventDefault()});let t=document.createElement(`div`);t.className=`pcg-overlay`;let n=document.createElement(`h1`);n.textContent=e.title;let r=document.createElement(`span`);r.className=`pcg-chevron`,r.textContent=`▾`,n.appendChild(r),t.appendChild(n),n.setAttribute(`role`,`button`),n.tabIndex=0;let i=()=>{n.setAttribute(`aria-expanded`,String(!t.classList.contains(`pcg-collapsed`)))},a=()=>{t.classList.toggle(`pcg-collapsed`),i()};n.addEventListener(`click`,a),n.addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),a())});let o=k();if(o.matches&&t.classList.add(`pcg-collapsed`),o.addEventListener(`change`,e=>{t.classList.toggle(`pcg-collapsed`,e.matches),i()}),i(),e.info){let n=document.createElement(`p`);n.className=`pcg-info`,n.textContent=e.info,t.appendChild(n)}let s=document.createElement(`div`);t.appendChild(s);let c=document.createElement(e.foldStats?`details`:`div`);if(c.className=`pcg-stats`,e.foldStats){let e=document.createElement(`summary`);e.textContent=`Stats`,c.appendChild(e)}t.appendChild(c),document.body.appendChild(t);function l(e){let t=document.createElement(`div`);t.className=`pcg-row`;let n=document.createElement(`label`);return n.textContent=e,t.appendChild(n),s.appendChild(t),t}function u(e,t){let n=document.createElement(`span`);n.className=`pcg-numbox`,n.appendChild(e);let r=document.createElement(`span`);r.className=`pcg-steps`;for(let[n,i,a]of[[-1,`−`,`Decrease`],[1,`+`,`Increase`]]){let o=document.createElement(`button`);o.type=`button`,o.tabIndex=-1,o.textContent=i,o.setAttribute(`aria-label`,a);let s,c,l=()=>{n>0?e.stepUp():e.stepDown(),t()},u=()=>{clearTimeout(s),clearInterval(c)};o.addEventListener(`pointerdown`,e=>{e.preventDefault(),l(),s=setTimeout(()=>{c=setInterval(l,60)},400)});for(let e of[`pointerup`,`pointerleave`,`pointercancel`])o.addEventListener(e,u);r.appendChild(o)}return n.appendChild(r),n}return{el:t,addSeed(e,t){let n=l(`Seed`),r=document.createElement(`input`);r.type=`number`,r.step=`1`,r.min=`0`,r.value=String(e);let i=()=>{let e=Math.floor(r.valueAsNumber);Number.isFinite(e)&&t(e>>>0)};r.addEventListener(`change`,i),n.appendChild(u(r,i))},addSlider(e,t,n){let r=l(e),i=document.createElement(`input`);i.type=`range`,i.min=String(t.min),i.max=String(t.max),i.step=String(t.step),i.value=String(t.value);let a=document.createElement(`span`);a.className=`pcg-val`;let o=t.format??(e=>String(e));a.textContent=o(t.value);let s=e=>{let n=t.max-t.min,r=n>0?(e-t.min)/n:0;i.style.setProperty(`--p`,`${Math.min(1,Math.max(0,r))*100}%`)};return s(t.value),i.addEventListener(`input`,()=>{let e=Number(i.value);a.textContent=o(e),s(e),n(e)}),r.appendChild(i),r.appendChild(a),r},addSelect(e,t,n,r){let i=l(e),a=document.createElement(`select`);for(let e of t){let t=document.createElement(`option`);t.value=e.value,t.textContent=e.label,a.appendChild(t)}a.value=n,a.addEventListener(`change`,()=>r(a.value)),i.appendChild(a)},addCheckbox(e,t,n){let r=l(e),i=document.createElement(`input`);return i.type=`checkbox`,i.checked=t,i.addEventListener(`change`,()=>n(i.checked)),r.appendChild(i),i},addStat(e){let t=document.createElement(`div`);t.className=`pcg-stat`;let n=document.createElement(`span`);n.textContent=e;let r=document.createElement(`span`);return r.textContent=`–`,t.appendChild(n),t.appendChild(r),c.appendChild(t),e=>{r.textContent=String(e)}},addCollapsible(e,n=!1){let r=document.createElement(`details`);r.open=n;let i=document.createElement(`summary`);i.textContent=e,r.appendChild(i);let a=document.createElement(`pre`);return r.appendChild(a),t.appendChild(r),a},addNote(e){let n=document.createElement(`p`);n.className=`pcg-note`,n.textContent=e,t.appendChild(n)},addSlot(e=`bottom`){let n=document.createElement(`div`);return n.className=e===`top`?`pcg-slot pcg-slot-top`:`pcg-slot`,e===`top`?t.insertBefore(n,s):e===`controls`?s.appendChild(n):t.appendChild(n),n}}}var ne=n(`<path class="edge-casing svelte-v559t8"></path><path></path>`,1),re=n(`<svg role="img"><g><!><!></g></svg>`);function $(n,r){G(r,!0);let i=F(r,`previews`,19,()=>new Map),a=F(r,`interactive`,3,!0),s=F(r,`label`,3,`Node graph`),c=V(void 0),u=V(N({x:0,y:0,z:1})),d=null,h=z(()=>new Map([...i()].map(([e,t])=>[e,t.length]))),v=z(()=>new Map(r.nodes.map(e=>[e.id,e])));function y(e,t){return r.floor??P(e,t)}function S(){if(!l(c))return;let e=l(c).getBoundingClientRect();if(e.width===0||e.height===0)return;let t=M(r.nodes,l(h));K(u,U(t,e,{floor:y(t,e),preferActual:a()}),!0)}function k(){if(!l(c))return;let e=M(r.nodes,l(h));K(u,e===null?{x:0,y:0,z:1}:te(1,e,l(c).getBoundingClientRect()),!0)}T(()=>{r.nodes,r.floor,a(),S()}),T(()=>{let e=l(c);if(!e)return;let t=new ResizeObserver(()=>S());return t.observe(e),()=>t.disconnect()});function ee(e){if(!a()||!l(c))return;e.preventDefault();let t=l(c).getBoundingClientRect(),n=y(M(r.nodes,l(h)),t);K(u,I(l(u),t,e.clientX,e.clientY,e.deltaY,n),!0)}function L(e){!a()||e.button!==0||(d={px:e.clientX,py:e.clientY,ox:l(u).x,oy:l(u).y},l(c)?.setPointerCapture(e.pointerId))}function R(e){d&&K(u,{...l(u),x:d.ox+(e.clientX-d.px),y:d.oy+(e.clientY-d.py)},!0)}function q(){d=null}function J(){a()&&S()}var Y={fit:S,actualSize:k},X=re();C(`pointermove`,w,R),C(`pointerup`,w,q);let Z;var Q=E(X),$=E(Q);t($,17,()=>r.edges,e=>`${e.from}.${e.fromPin}->${e.to}.${e.toPin}`,(t,n)=>{let r=z(()=>j(l(v),l(n)));var i=_(),a=g(i),s=t=>{var i=ne(),a=g(i),s=e(a);f(e=>{A(a,`d`,l(r)),o(s,0,`edge-line k-${e??``}`,`svelte-v559t8`),A(s,`d`,l(r))},[()=>W(l(v),l(n))]),p(t,i)};m(a,e=>{l(r)&&e(s)}),p(t,i)});var ie=e($);return t(ie,17,()=>r.nodes,e=>e.id,(e,t)=>{{let n=z(()=>i().get(l(t).id));D(e,{get node(){return l(t)},get params(){return l(n)}})}}),B(Q),B(X),O(X,e=>K(c,e),()=>l(c)),f(e=>{Z=o(X,0,`view svelte-v559t8`,null,Z,{interactive:a()}),A(X,`aria-label`,s()),A(Q,`transform`,`translate(${l(u).x??``} ${l(u).y??``}) scale(${l(u).z??``})`),b(Q,`--hairline: ${e??``}`)},[()=>Math.max(1,1/l(u).z)]),C(`wheel`,X,ee),x(`pointerdown`,X,L),x(`dblclick`,X,J),p(n,X),H(Y)}u([`pointerdown`,`dblclick`]);function ie(e){let t=e.parentNode;return document.body.appendChild(e),{destroy(){t&&e.parentNode===document.body&&t.appendChild(e),e.remove()}}}function ae(e){return typeof e==`object`&&!!e&&!Array.isArray(e)&&`fn`in e}function oe(e){if(ae(e))try{return`ƒ ${s(e).replace(/\s+/g,` `)}`}catch{return`ƒ`}return typeof e==`number`?J(e):typeof e==`boolean`?String(e):typeof e==`string`?e===``?`–`:e:Array.isArray(e)?e.length===0?`–`:e.map(e=>typeof e==`number`?J(e):String(e)).join(`, `):e==null?`–`:`…`}function se(e,t){try{return r(e.type)}catch{let n=e=>[...e??[]].map(e=>({name:e,kind:`any`,multi:!1}));return{inputs:n(t.inputs.get(e.id)),outputs:n(t.outputs.get(e.id))}}}function ce(e){let t=new Map,n=new Map,r=(e,t,n)=>{let r=e.get(t);r||e.set(t,r=new Set),r.add(n)};for(let i of e.connections??[])r(n,i.from[0],i.from[1]),r(t,i.to[0],i.to[1]);for(let t of e.outputs??[])r(n,t.id,t.pin);return{inputs:t,outputs:n}}function le(e){let t=ce(e),n=new Map,r=e.nodes.map(e=>{let r=se(e,t),i=v(e.type),a=Object.entries(e.params).map(([e,t])=>({key:e,value:oe(t),field:ae(t)}));return n.set(e.id,q(a)),{id:e.id,type:e.type,...e.ref===void 0?{}:{label:e.ref.name},...i===void 0?{}:{category:i},x:0,y:0,inputs:r.inputs,outputs:r.outputs}}),i=(e.connections??[]).map(e=>({from:e.from[0],fromPin:e.from[1],to:e.to[0],toPin:e.to[1]}));return y(r,i,new Map([...n].map(([e,t])=>[e,t.length]))),{nodes:r,edges:i,previews:n}}var ue=Y(`<button type="button" role="tab"> </button>`),de=Y(`<div class="tabs svelte-ul999b" role="tablist" aria-label="Graphs"></div>`),fe=Y(`<span class="heading svelte-ul999b"> </span>`),pe=Y(`<p class="empty svelte-ul999b">This graph could not be laid out.</p>`),me=Y(`<div class="backdrop svelte-ul999b" role="presentation"><div class="sheet svelte-ul999b" role="dialog" aria-modal="true"><header class="svelte-ul999b"><!> <span class="meta svelte-ul999b"><!></span> <button class="close svelte-ul999b" type="button" aria-label="Close">✕</button></header> <div class="body svelte-ul999b"><!></div> <footer class="svelte-ul999b">Scroll to zoom · drag to pan · double-click to fit · read-only</footer></div></div>`),he=Y(`<div class="pcg-graph-panel svelte-ul999b"><button class="thumb svelte-ul999b" type="button"><span class="cap svelte-ul999b"><span class="name svelte-ul999b"> </span> <span class="count svelte-ul999b"><!></span></span> <span class="frame svelte-ul999b"><!></span></button></div> <!>`,1);function ge(n,r){G(r,!0);let i=F(r,`title`,3,`Graph`),s=V(N(r.initial)),u=V(!1),d=V(0);function h(e){K(s,e,!0),l(d)>=e.length&&K(d,0),b()}let _=V(N([])),v=z(()=>l(_)[Math.min(l(d),l(_).length-1)]??null),y=z(()=>l(s)[Math.min(l(d),l(s).length-1)]?.name??``);function b(){K(_,l(s).map(e=>{try{return le(e.json)}catch{return null}}),!0)}L(b);function T(e){e.key===`Escape`&&l(u)&&(e.preventDefault(),K(u,!1))}var D={setGraphs:h},O=he();C(`keydown`,w,T);var k=g(O),j=E(k),M=E(j),P=E(M),I=E(P,!0);B(P);var R=e(P,2),te=E(R),U=e=>{var t=S();f(()=>c(t,`${l(v).nodes.length??``} nodes`)),p(e,t)},W=e=>{var t=S(`…`);p(e,t)};m(te,e=>{l(v)?e(U):e(W,-1)}),B(R),B(M);var q=e(M,2),J=E(q),Y=e=>{$(e,{get nodes(){return l(v).nodes},get edges(){return l(v).edges},get previews(){return l(v).previews},interactive:!1,floor:.09,get label(){return`${l(y)??``} graph, thumbnail`}})};m(J,e=>{l(v)&&e(Y)}),B(q),B(j),B(k);var X=e(k,2),Z=n=>{var r=me(),i=E(r),h=E(i),g=E(h),_=e=>{var n=de();t(n,23,()=>l(s),e=>e.name,(e,t,n)=>{var r=ue();let i;var a=E(r,!0);B(r),f(()=>{A(r,`aria-selected`,l(n)===l(d)),i=o(r,1,`svelte-ul999b`,null,i,{on:l(n)===l(d)}),c(a,l(t).name)}),x(`click`,r,()=>K(d,l(n),!0)),p(e,r)}),B(n),p(e,n)},b=e=>{var t=fe(),n=E(t,!0);B(t),f(()=>c(n,l(y))),p(e,t)};m(g,e=>{l(s).length>1?e(_):e(b,-1)});var C=e(g,2),w=E(C),T=e=>{var t=S();f(()=>c(t,`${l(v).nodes.length??``} nodes · ${l(v).edges.length??``} connections`)),p(e,t)};m(w,e=>{l(v)&&e(T)}),B(C);var D=e(C,2);B(h);var O=e(h,2),k=E(O),j=e=>{$(e,{get nodes(){return l(v).nodes},get edges(){return l(v).edges},get previews(){return l(v).previews},get label(){return`${l(y)??``} graph`}})},M=e=>{var t=pe();p(e,t)};m(k,e=>{l(v)?e(j):e(M,-1)}),B(O),ee(2),B(i),B(r),a(r,e=>ie?.(e)),f(()=>A(i,`aria-label`,`${l(y)??``} graph`)),x(`pointerdown`,r,e=>e.target===e.currentTarget&&K(u,!1)),x(`click`,D,()=>K(u,!1)),p(n,r)};return m(X,e=>{l(u)&&e(Z)}),f(()=>{A(j,`aria-label`,`Show the ${(l(y)||i())??``} graph`),c(I,l(y)||i())}),x(`click`,j,()=>K(u,!0)),p(n,O),H(D)}u([`click`,`pointerdown`]);function _e(e){let t=[];for(let n of e)try{t.push({name:n.name,json:i(n.graph)})}catch(e){console.warn(`graph panel: "${n.name}" could not be serialized, so it is not shown`,e)}return t}function ve(e,t){let n=document.createElement(`div`);t.into.appendChild(n);let r=h(ge,{target:n,props:{initial:_e(e),title:t.title??`Graph`}}),i=r;return{set(e){i.setGraphs(_e(e))},destroy(){d(r),n.remove()}}}export{Q as n,ve as t};