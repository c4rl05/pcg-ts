import{$n as e,An as t,D as n,Dn as r,Dr as i,Gr as a,It as o,Kn as ee,Ln as s,Rt as te,Yr as c,bi as l,br as ne,ei as re,gn as ie,hn as ae,ii as oe,jn as se,lr as ce,r as u,ti as le,yr as d}from"./wordmark-BGS-HLW0.js";import{t as ue}from"./types-C9vZymIy.js";import{A as f,Ht as p,St as m,U as h,W as de,jt as g,q as _}from"./three.core-auuZCBBV.js";import{t as fe}from"./scene-BYRX2PP5.js";import{t as pe}from"./gpu-l40w7WNs.js";import{r as me}from"./three-BKeoBb8c.js";import{n as he,t as ge}from"./panel-C-BpG2cn.js";var _e=.35,ve=777;function ye(){let e=new ee,t=e.add(ae,{count:170,boundsMin:[-800,0,-800],boundsMax:[800,0,800]}),n=e.add(s,{name:`scale`,tupleSize:3,value:(()=>{let e=c(oe(`mega`),0,1,5,13);return re(e,a(e,1.6),e)})()}),r=e.add(te,{assetId:`megarock`});return e.connect(t,`out`,n,`in`),e.connect(n,`out`,r,`in`),e.output(r,`instances`,`instances`),{name:`landmarks`,cellSize:`unbounded`,generationRadius:1/0,graph:e,bind(e,r){e.setParam(t,`seed`,r.seed),e.setParam(n,`seed`,l(r.seed,9))}}}function be(n){let{cellSize:o,generationRadius:ne,anchored:u}=n,d=n.halo?4:0,f=new ee,p=u?f.add(ie,{density:_e,cellSize:7,latticeMode:`xz`,height:0}):f.add(ae,{count:Math.round(_e*(o+2*d)**2)}),m=f.add(s,{name:`density`,tupleSize:1,value:c(e(ce,{seed:ve,frequency:.02,octaves:3}),-1,1,0,1)}),h=f.add(se,{mode:`probabilistic`}),de=f.add(r,{radius:4,countAttr:`nbrCount`}),g=f.add(t,{mode:`inside`}),_=f.add(s,{name:`scale`,tupleSize:3,value:(()=>{let e=c(i(le(`nbrCount`),2,16),2,16,.4,1.35),t=a(e,c(oe(`rock`),0,1,.85,1.15));return re(t,t,t)})()}),fe=f.add(te,{assetId:`rock`});return f.connect(p,`out`,m,`in`),f.connect(m,`out`,h,`in`),f.connect(h,`out`,de,`in`),f.connect(de,`out`,g,`in`),f.connect(g,`out`,_,`in`),f.connect(_,`out`,fe,`in`),f.output(fe,`instances`,`instances`),{name:`rocks`,cellSize:o,generationRadius:ne,graph:f,bind(e,t){let{min:n,max:r}=ue(t);e.setParam(p,`boundsMin`,[n[0]-d,0,n[1]-d]),e.setParam(p,`boundsMax`,[r[0]+d,0,r[1]+d]);let i=u?t.worldSeed:t.seed;e.setParam(p,`seed`,i),e.setParam(h,`seed`,l(i,1)),e.setParam(_,`seed`,l(i,2)),e.setParam(g,`boundsMin`,[n[0],-1,n[1]]),e.setParam(g,`boundsMax`,[r[0],1,r[1]])}}}function xe(e){return e instanceof Error?e.message:String(e)}function Se(e){let t=(e?.description??``)===``?e?.device:e?.description;return[e?.vendor,e?.architecture,t].filter(e=>typeof e==`string`&&e!==``).join(` · `)||`adapter (no info exposed)`}async function Ce(e){let t=navigator.gpu;if(t===void 0)return{error:`navigator.gpu is missing — this browser has no WebGPU.`};try{let n=await t.requestAdapter();if(n===null)return{error:`navigator.gpu.requestAdapter() returned null — no compatible GPU adapter.`};let r=n.info,i=await n.requestDevice(),a=i.lost;return a!==void 0&&a.then(t=>{e(`${t?.reason??`unknown`}: ${t?.message??`no detail`}`)}),{device:i,info:r,label:Se(r)}}catch(e){return{error:`requestDevice() failed: ${xe(e)}`}}}function we(e){let t=e.info===void 0?{}:{adapterInfo:e.info};return{derived:new pe(e.device,{...t,acceptDerivedSpecs:!0}),strict:new pe(e.device,t)}}var Te=class{cacheSalt;residentTerminals;acceptDerivedSpecs;base;seen=new Set;constructor(e){this.base=e,this.cacheSalt=e.cacheSalt,this.residentTerminals=e.residentTerminals,this.acceptDerivedSpecs=e.acceptDerivedSpecs}resolveField(e,t,n){return n!==void 0&&this.seen.add(n),this.base.resolveField(e,t,n)}planRun(e,t,n){return n!==void 0&&this.seen.add(n),this.base.planRun(e,t,n)}executeRun(e,t,n){return n!==void 0&&this.seen.add(n),this.base.executeRun(e,t,n)}drain(){if(this.seen.size===0)return;let e=ne();for(let t of this.seen){e.dispatches+=t.dispatches,e.pipelinesCompiled+=t.pipelinesCompiled,e.pipelineCacheHits+=t.pipelineCacheHits,e.residentRuns+=t.residentRuns,e.fusedNodes+=t.fusedNodes,e.readbacksSaved+=t.readbacksSaved;for(let[n,r]of Object.entries(t.fallbacks))e.fallbacks[n]=(e.fallbacks[n]??0)+r}return this.seen.clear(),e}};function Ee(e){let t=Object.entries(e).sort(([e],[t])=>e.localeCompare(t));return t.length===0?`none`:t.map(([e,t])=>`${e} ×${t}`).join(`, `)}var v=1,y=18,b=140,x=`gpu`,S=!0,C=20,w=!0,T=!0,E=!0,De=7,Oe=12,ke=8,Ae=5e3;function je(e){return e instanceof Error?e.message:String(e)}var{scene:D,camera:O,start:Me}=fe({cameraPosition:[0,26,0],orbit:!1,fog:{near:140,far:640},far:1600}),k=new m(new p(4e3,4e3),new g({color:1449515,roughness:1}));k.rotation.x=-Math.PI/2,k.position.y=-.03,D.add(k);var Ne=40,A;function Pe(){A&&(D.remove(A),A.geometry.dispose(),A.material.dispose());let e=new h(C*Ne,Ne,4158656,2903936),t=e.material;t.transparent=!0,t.opacity=.45,t.depthWrite=!1,e.position.y=.02,e.visible=E,D.add(e),A=e}function Fe(){!A||!A.visible||(A.position.x=Math.round(O.position.x/C)*C,A.position.z=Math.round(O.position.z/C)*C)}var Ie=new g({color:8028816,roughness:.95,flatShading:!0}),Le=new g({color:6121077,roughness:1,flatShading:!0}),Re={megarock:{geometry:new f(1).translate(0,.62,0),material:Le},rock:{geometry:new _(.55).translate(0,.33,0),material:Ie}},j,ze,M=`requesting…`,N,P=!1,Be=``,F;function I(){return j!==void 0&&!P}function Ve(){if(!(x===`cpu`||!I()))return S?j:ze}var L;function He(e,t){let n=[{name:`landmarks`,graph:e},{name:`rocks`,graph:t}];L?L.set(n):L=ge(n,{into:_t,title:`infinite world`})}function Ue(e,t){let n=e*1.25/t+1.5;return Math.max(256,Math.ceil(Math.PI*n*n))}function We(e){let t=0;for(let n of Object.keys(e))for(let r of e[n])if(r.kind===`instances`)for(let e of r.batches)t+=e.count;return t}var R,Ge=0,z,Ke=0,B=!1,qe=0;function V(){R&&(R.disposed=!0,R.abort.abort(),R.binding.dispose(),D.remove(R.group));let e=new de;D.add(e);let t=new me({group:e,assets:Re}),n=new Map,r=Ve(),i={world:void 0,group:e,binding:t,cellInstances:n,tap:r===void 0?void 0:new Te(r),abort:new AbortController,disposed:!1},a=[ye(),be({cellSize:C,generationRadius:b,anchored:w,halo:T})];He(a[0].graph,a[1].graph),i.world=new o({seed:v,levels:a,maxCellsPerLevel:Ue(b,C),...i.tap===void 0?{}:{gpu:i.tap},onCellReady:(e,r,a)=>{i.disposed||(t.cellReady(e,r,a),n.set(`${e}|${r[0]},${r[1]}`,We(a)))},onCellEvicted:(e,r)=>{i.disposed||(t.cellEvicted(e,r),n.delete(`${e}|${r[0]},${r[1]}`))}}),R=i,Ge=0,F=void 0,z=void 0,Q(),Je(i,Oe)}function Je(e,t){let n=++qe;$=!0,Ke=performance.now(),e.world.update([O.position.x,0,O.position.z],{budgetMs:t,maxCooksPerUpdate:ke,signal:e.abort.signal,...e.tap===void 0?{}:{gpu:e.tap}}).then(t=>{if(e.disposed)return;Ge=t.pending,z=t.elapsedMs;let n=e.tap?.drain();n!==void 0&&(F=n),Q(),B&&(B=!1,X(gt()))}).catch(t=>{t instanceof d||(console.error(t),e.disposed||X(`update failed: ${je(t)}`))}).finally(()=>{n===qe&&($=!1)})}var H=0,Ye=0,U=new Set;window.addEventListener(`keydown`,e=>{let t=e.key.toLowerCase();if(t===`g`){nt(x===`gpu`?`cpu`:`gpu`);return}U.add(t)}),window.addEventListener(`keyup`,e=>U.delete(e.key.toLowerCase())),document.addEventListener(`visibilitychange`,()=>{document.visibilityState===`visible`&&(Ke=performance.now())});var W=he({title:`infinite world`,info:`Unbounded landmark level + world-anchored rock cells streamed around a flying camera. Steer with A/D or arrow keys.`}),Xe=document.createElement(`style`);Xe.textContent=`
.pcg04-seg { display: flex; gap: 6px; margin: 4px 0 4px; }
.pcg04-seg button {
  flex: 1; padding: 6px 4px; cursor: pointer; border-radius: var(--ed-radius);
  border: 1px solid var(--ed-edge); background: var(--ed-well); color: var(--ed-ink-mid);
  font: 12px system-ui, sans-serif;
}
.pcg04-seg button:hover:not(:disabled) { border-color: var(--ed-accent); color: var(--ed-ink); }
.pcg04-seg button[aria-pressed="true"] { background: var(--ed-raised-hi); border-color: var(--ed-accent); color: var(--ed-ink-hi); }
.pcg04-seg button:disabled { opacity: 0.4; cursor: not-allowed; }
.pcg04-hint { margin: 0 0 10px; color: var(--ed-ink-faint); font-size: 11px; }
`,document.head.appendChild(Xe);var Ze=W.el.querySelector(`.pcg-stats`)?.previousElementSibling??W.el;W.addSeed(v,e=>{v=e,V()}),W.addSlider(`speed`,{min:0,max:80,step:1,value:y,format:e=>`${e} u/s`},e=>{y=e}),W.addSlider(`gen radius`,{min:60,max:240,step:10,value:b,format:e=>`${e} u`},e=>{b=e,V()}),W.addSlider(`cell size`,{min:20,max:80,step:20,value:C,format:e=>`${e} u`},e=>{C=e,Pe(),V()}),W.addCheckbox(`world-anchored`,w,e=>{w=e,ht(),V()}),W.addCheckbox(`halo (4 u)`,T,e=>{T=e,V()}),W.addCheckbox(`cell grid`,E,e=>{E=e,A&&(A.visible=e),Fe()});var Qe=document.createElement(`div`);Qe.className=`pcg04-seg`;var G=document.createElement(`button`);G.type=`button`,G.textContent=`GPU per-node`;var K=document.createElement(`button`);K.type=`button`,K.textContent=`CPU`,Qe.append(G,K);var $e=document.createElement(`p`);$e.className=`pcg04-hint`,$e.textContent=`G switches path · A/D or ←/→ steer`;var et=document.createElement(`div`);et.className=`pcg-row`;var tt=document.createElement(`label`);tt.textContent=`derived specs`;var q=document.createElement(`input`);q.type=`checkbox`,q.checked=S,q.addEventListener(`change`,()=>{S=q.checked,V()}),et.append(tt,q),Ze.prepend(Qe,$e,et);function nt(e){if(e!==x){if(e===`gpu`&&!I()){X(P?Z():N??`GPU path not ready yet.`);return}x=e,J(),V(),X(gt())}}G.addEventListener(`click`,()=>nt(`gpu`)),K.addEventListener(`click`,()=>nt(`cpu`));function J(){G.setAttribute(`aria-pressed`,String(x===`gpu`)),K.setAttribute(`aria-pressed`,String(x===`cpu`)),G.disabled=!I(),G.title=N===void 0?P?Z():``:N,q.disabled=!I()||x===`cpu`}var Y=W.addStat(`adapter`),rt=W.addStat(`fps`),it=W.addStat(`rock source`),at=W.addStat(`rock cells`),ot=W.addStat(`cooked / evicted`),st=W.addStat(`pending`),ct=W.addStat(`instances`),lt=W.addStat(`position`),ut=W.addStat(`cook`),dt=W.addStat(`resident runs / fused members`),ft=W.addStat(`device dispatches`),pt=W.addStat(`gpu fallbacks`),mt=W.addStat(`status`);function X(e){mt(e)}function ht(){it(w?`pointScatterInWorld`:`pointScatterInBounds`)}function Z(){return`device lost (${Be}) — the GPU path is disabled; reload for a fresh device`}function gt(){return P?Z():x===`cpu`?`CPU path — no resolver passed to the cook`:I()?S?`GPU per-node — combinator fields accepted via acceptDerivedSpecs`:`GPU per-node — acceptDerivedSpecs off, so every field falls back`:N??`requesting WebGPU adapter…`}function Q(){if(ut(z===void 0?`–`:`${z.toFixed(1)} ms`),F===void 0){dt(R?.tap===void 0?`– (no GPU resolver)`:`–`),ft(`–`),pt(`–`);return}dt(`${F.residentRuns} / ${F.fusedNodes}`),ft(String(F.dispatches)),pt(Ee(F.fallbacks))}var _t=W.addSlot();u(),W.addNote(`Drag “cell size”: the blue grid re-cells the world and the rocks do not move or resize. Untick “halo” to watch every border grow a band of undersized rocks, and “world-anchored” to watch the same drag re-roll the world from scratch.`);var vt=W.addCollapsible(`anchoring · what the fine level actually does`);vt.textContent=`pointScatterInWorld scatters over an INFINITE lattice fixed to
world coordinates and returns the points inside the query
window. Position and per-point seed are a pure function of the
node seed, the seed param, the lattice mode, the lattice cellSize
and the point's own lattice cell and index — never of the window.
Three consequences, and this page leans on all three:

  1  the window only SELECTS. Re-cell the world (the cell size
     slider) and the same rocks come back, because nothing in
     their derivation ever saw a cell.
  2  a halo is just a wider query. Each rock's SIZE comes from
     pointNeighborhood counting the rocks within 4 u of it,
     which does not stop at a border — so each cell queries
     itself grown by 4 u, measures over that, and only then
     clips back with filterByBounds. Both cells sharing a border
     derive the same points in the overlap and count the same
     neighbours, so a rock is the same size either way.
     A counted neighbourhood has a FINITE halo width, exactly
     the radius; a greedy op like selfPrune, whose verdict for
     one point depends on verdicts for others, has none, which
     is why size here is measured rather than competed for.
  3  a cell never asks a sibling for anything. It derives the
     halo from world coordinates, so cook order, eviction and
     which neighbours happen to be resident change nothing.

The lattice cellSize is 7 u here — the content's own scale,
deliberately NOT the World cell size. Tying the two would make
the world a function of the runtime's partitioning, which is
exactly what the cell size slider is there to disprove.

Downstream ops stay anchored because their randomness and their
orderings key on point IDENTITY (stored position bits plus the
per-point seed attribute), not on array index: filterByDensity's
probabilistic draw, pointNeighborhood's tie-break and summation
order, and randomField inside the scale field all decide the
same way for the same rock in whichever cell derived it, however
many points were filtered out of the array first.

bind therefore seeds those nodes from ctx.worldSeed, which is
cell-INVARIANT, and passes only the window per cell. It never
calls graph.setSeed: a per-cell whole-graph reseed reaches the
source's node seed too and quietly turns it back into a per-cell
scatter — still deterministic, no longer anchored.

Unticking "world-anchored" swaps in pointScatterInBounds over
the identical window, at the same expected population. Its
positions are a function OF the window, so the halo reproduces
nothing: every rock re-rolls when the partition changes, and
each cell measures its seams against neighbours the cell next
door has never heard of. Deterministic, still — and useless for
anything that has to see past its own bounds.`;var yt=W.addCollapsible(`diagnostics · why nothing fuses here`);yt.textContent=`resident runs / fused members reads 0 / 0 on BOTH paths, and
that is a property of these graphs, not of the device.

A device-resident run needs two or more ADJACENT fusable nodes.
Of the node types used here, only setAttribute declares a CHAIN
resident descriptor. The scatter sources, the two filters and
pointNeighborhood declare none, and spawnInstances declares a
TERMINAL one, which joins a run only when the resolver advertises
that kind in residentTerminals — this page does not (see 09).

  landmarks   scatter -> setAttribute -> spawnInstances
                         ^ lone fusable node: a run of one, so no run

  rocks       scatter -> setAttribute -> filterByDensity
                      -> pointNeighborhood -> filterByBounds
                      -> setAttribute -> spawnInstances
                         ^ two fusable nodes, three non-members
                           between them: two runs of one

Every member of a run must be element-count preserving on one
geometry in/out, which rules out filterByDensity and
filterByBounds outright. pointNeighborhood does preserve the
count, but it declares no resident descriptor — a spatial query
is not a per-element kernel — so it cannot be a member either.
The three of them are exactly what breaks the only chain here
that could have fused: delete them and the two setAttribute nodes
become a single 2-member run.

What acceptDerivedSpecs buys on this page is the PER-NODE path.
Every field in levels.ts is combinator-built (remap, vec, mul,
randomField, fbm(perlinNoise)), so each derives its spec rather
than having one authored via fieldFromJson:

  flag off   each field counts a "derived-spec" fallback and
             evaluates on the CPU -> 0 dispatches
  flag on    each field compiles to WGSL -> 1 dispatch per
             resolved field column

Field columns offered to the device per cook:
  landmarks   1   (the scale vec)
  rocks       2   (the density fbm, the scale vec)

Reading the numbers: "cook" is UpdateStats.elapsedMs, the wall time
of one budgeted update, which may cook several cells or none. World
discards each cell's CookStats, so the three counters under it are
summed from the CookStats.gpu objects captured by the resolver tap
over that same update, and hold their last non-empty value when an
update cooks nothing.`;function bt(e){P=!0,Be=e,M=`device lost`,Y(M),X(Z()),J(),x===`gpu`&&(x=`cpu`,J(),V())}async function xt(){let e=await Ce(bt);if(`error`in e){N=e.error,M=`no WebGPU adapter`,Y(M),x=`cpu`,J(),X(`${e.error} Running the CPU path.`);return}try{let t=we(e);j=t.derived,ze=t.strict}catch(e){N=`GpuFieldEvaluator construction failed: ${je(e)}`,M=`evaluator unavailable`,Y(M),x=`cpu`,J(),X(`${N} Running the CPU path.`);return}P||(M=e.label,Y(M),J(),X(gt()),x===`gpu`&&V())}var $=!1,St=n(e=>rt(e));Y(M),X(`requesting WebGPU adapter…`),J(),ht(),Q(),Pe(),V(),xt(),Me(e=>{St(),Ye=(U.has(`a`)||U.has(`arrowleft`)?1:0)-(U.has(`d`)||U.has(`arrowright`)?1:0),H+=Ye*1.1*e,O.position.x+=Math.sin(H)*y*e,O.position.z+=Math.cos(H)*y*e,O.position.y=26,O.lookAt(O.position.x+Math.sin(H)*60,5,O.position.z+Math.cos(H)*60),Fe();let t=R;if(t&&!$?Je(t,De):$&&!B&&performance.now()-Ke>Ae&&(B=!0,X(`a cook has been in flight for over 5 s — the GPU device may have been lost.`)),t){let e=t.world.stats(),n=e.levels.find(e=>e.name===`rocks`)?.cellCount??0;at(String(n)),ot(`${e.totalCooked} / ${e.totalEvicted}`),st(String(Ge));let r=0;for(let e of t.cellInstances.values())r+=e;ct(String(r)),lt(`${O.position.x.toFixed(0)}, ${O.position.z.toFixed(0)}`)}});