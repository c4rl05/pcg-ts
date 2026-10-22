import{Bs as e,Gs as t,Ko as n,So as r,Xs as i,Xt as a,Zs as o,_a as ee,_o as te,_t as ne,an as s,bs as re,bt as ie,ec as ae,eo as oe,fs as c,gc as l,gn as u,gt as d,jo as f,ns as se,pa as p,ps as m,r as ce,rt as h,to as le,xo as ue,zo as de}from"./wordmark-BioD6ivW.js";import{t as fe}from"./types-C9vZymIy.js";import{t as g}from"./fps-BGOI9Z95.js";import{t as _}from"./scene--hFsHzIq.js";import{r as pe}from"./three-CohrATwr.js";import{t as me}from"./gpu-CkSObuLR.js";import{n as he,t as ge}from"./panel-xMqEtA8G.js";var _e=.35,ve=777;function ye(){let n=new de,r=n.add(oe,{count:170,boundsMin:[-800,0,-800],boundsMax:[800,0,800]}),a=n.add(f,{name:`scale`,tupleSize:3,value:(()=>{let n=t(ae(`mega`),0,1,5,13);return i(n,e(n,1.6),n)})()}),o=n.add(ee,{assetId:`megarock`});return n.connect(r,`out`,a,`in`),n.connect(a,`out`,o,`in`),n.output(o,`instances`,`instances`),{name:`landmarks`,cellSize:`unbounded`,generationRadius:1/0,graph:n,bind(e,t){e.setParam(r,`seed`,t.seed),e.setParam(a,`seed`,l(t.seed,9))}}}function be(a){let{cellSize:ne,generationRadius:s,anchored:ie}=a,c=a.halo?4:0,u=new de,d=ie?u.add(le,{density:_e,cellSize:7,latticeMode:`xz`,height:0}):u.add(oe,{count:Math.round(_e*(ne+2*c)**2)}),p=u.add(f,{name:`density`,tupleSize:1,value:t(n(se,{seed:ve,frequency:.02,octaves:3}),-1,1,0,1)}),m=u.add(r,{mode:`probabilistic`}),ce=u.add(te,{radius:4,countAttr:`nbrCount`}),h=u.add(ue,{mode:`inside`}),g=u.add(f,{name:`scale`,tupleSize:3,value:(()=>{let n=t(re(o(`nbrCount`),2,16),2,16,.4,1.35),r=e(n,t(ae(`rock`),0,1,.85,1.15));return i(r,r,r)})()}),_=u.add(ee,{assetId:`rock`});return u.connect(d,`out`,p,`in`),u.connect(p,`out`,m,`in`),u.connect(m,`out`,ce,`in`),u.connect(ce,`out`,h,`in`),u.connect(h,`out`,g,`in`),u.connect(g,`out`,_,`in`),u.output(_,`instances`,`instances`),{name:`rocks`,cellSize:ne,generationRadius:s,graph:u,bind(e,t){let{min:n,max:r}=fe(t);e.setParam(d,`boundsMin`,[n[0]-c,0,n[1]-c]),e.setParam(d,`boundsMax`,[r[0]+c,0,r[1]+c]);let i=ie?t.worldSeed:t.seed;e.setParam(d,`seed`,i),e.setParam(m,`seed`,l(i,1)),e.setParam(g,`seed`,l(i,2)),e.setParam(h,`boundsMin`,[n[0],-1,n[1]]),e.setParam(h,`boundsMax`,[r[0],1,r[1]])}}}function xe(e){return e instanceof Error?e.message:String(e)}function Se(e){let t=(e?.description??``)===``?e?.device:e?.description;return[e?.vendor,e?.architecture,t].filter(e=>typeof e==`string`&&e!==``).join(` · `)||`Adapter (no info exposed)`}async function Ce(e){let t=navigator.gpu;if(t===void 0)return{error:`navigator.gpu is missing — this browser has no WebGPU.`};try{let n=await t.requestAdapter();if(n===null)return{error:`navigator.gpu.requestAdapter() returned null — no compatible GPU adapter.`};let r=n.info,i=await n.requestDevice(),a=i.lost;return a!==void 0&&a.then(t=>{e(`${t?.reason??`unknown`}: ${t?.message??`no detail`}`)}),{device:i,info:r,label:Se(r)}}catch(e){return{error:`requestDevice() failed: ${xe(e)}`}}}function we(e){let t=e.info===void 0?{}:{adapterInfo:e.info};return{derived:new me(e.device,{...t,acceptDerivedSpecs:!0}),strict:new me(e.device,t)}}var Te=class{cacheSalt;residentTerminals;acceptDerivedSpecs;base;seen=new Set;constructor(e){this.base=e,this.cacheSalt=e.cacheSalt,this.residentTerminals=e.residentTerminals,this.acceptDerivedSpecs=e.acceptDerivedSpecs}resolveField(e,t,n){return n!==void 0&&this.seen.add(n),this.base.resolveField(e,t,n)}planRun(e,t,n){return n!==void 0&&this.seen.add(n),this.base.planRun(e,t,n)}executeRun(e,t,n){return n!==void 0&&this.seen.add(n),this.base.executeRun(e,t,n)}drain(){if(this.seen.size===0)return;let e=m();for(let t of this.seen){e.dispatches+=t.dispatches,e.pipelinesCompiled+=t.pipelinesCompiled,e.pipelineCacheHits+=t.pipelineCacheHits,e.residentRuns+=t.residentRuns,e.fusedNodes+=t.fusedNodes,e.readbacksSaved+=t.readbacksSaved;for(let[n,r]of Object.entries(t.fallbacks))e.fallbacks[n]=(e.fallbacks[n]??0)+r}return this.seen.clear(),e}};function Ee(e){let t=Object.entries(e).sort(([e],[t])=>e.localeCompare(t));return t.length===0?`none`:t.map(([e,t])=>`${e} ×${t}`).join(`, `)}var v=1,y=18,b=140,x=`gpu`,S=!0,C=20,w=!0,T=!0,E=!0,De=7,Oe=12,ke=8,Ae=5e3;function je(e){return e instanceof Error?e.message:String(e)}var{scene:D,camera:O,start:Me}=_({cameraPosition:[0,26,0],orbit:!1,fog:{near:140,far:640},far:1600}),Ne=new a(new u(4e3,4e3),new s({color:1449515,roughness:1}));Ne.rotation.x=-Math.PI/2,Ne.position.y=-.03,D.add(Ne);var Pe=40,k;function Fe(){k&&(D.remove(k),k.geometry.dispose(),k.material.dispose());let e=new d(C*Pe,Pe,4158656,2903936),t=e.material;t.transparent=!0,t.opacity=.45,t.depthWrite=!1,e.position.y=.02,e.visible=E,D.add(e),k=e}function Ie(){!k||!k.visible||(k.position.x=Math.round(O.position.x/C)*C,k.position.z=Math.round(O.position.z/C)*C)}var Le=new s({color:8028816,roughness:.95,flatShading:!0}),Re=new s({color:6121077,roughness:1,flatShading:!0}),ze={megarock:{geometry:new h(1).translate(0,.62,0),material:Re},rock:{geometry:new ie(.55).translate(0,.33,0),material:Le}},A,Be,j=`Requesting…`,M,N=!1,Ve=``,P;function F(){return A!==void 0&&!N}function He(){if(!(x===`cpu`||!F()))return S?A:Be}var Ue;function We(e,t){let n=[{name:`Landmarks`,graph:e},{name:`Rocks`,graph:t}];Ue?Ue.set(n):Ue=ge(n,{into:_t,title:`Infinite world`})}function Ge(e,t){let n=e*1.25/t+1.5;return Math.max(256,Math.ceil(Math.PI*n*n))}function Ke(e){let t=0;for(let n of Object.keys(e))for(let r of e[n])if(r.kind===`instances`)for(let e of r.batches)t+=e.count;return t}var I,qe=0,L,R=0,z=!1,Je=0;function B(){I&&(I.disposed=!0,I.abort.abort(),I.binding.dispose(),D.remove(I.group));let e=new ne;D.add(e);let t=new pe({group:e,assets:ze}),n=new Map,r=He(),i={world:void 0,group:e,binding:t,cellInstances:n,tap:r===void 0?void 0:new Te(r),abort:new AbortController,disposed:!1},a=[ye(),be({cellSize:C,generationRadius:b,anchored:w,halo:T})];We(a[0].graph,a[1].graph),i.world=new p({seed:v,levels:a,maxCellsPerLevel:Ge(b,C),...i.tap===void 0?{}:{gpu:i.tap},onCellReady:(e,r,a)=>{i.disposed||(t.cellReady(e,r,a),n.set(`${e}|${r[0]},${r[1]}`,Ke(a)))},onCellEvicted:(e,r)=>{i.disposed||(t.cellEvicted(e,r),n.delete(`${e}|${r[0]},${r[1]}`))}}),I=i,qe=0,P=void 0,L=void 0,gt(),Ye(i,Oe)}function Ye(e,t){let n=++Je;$=!0,R=performance.now(),e.world.update([O.position.x,0,O.position.z],{budgetMs:t,maxCooksPerUpdate:ke,signal:e.abort.signal,...e.tap===void 0?{}:{gpu:e.tap}}).then(t=>{if(e.disposed)return;qe=t.pending,L=t.elapsedMs;let n=e.tap?.drain();n!==void 0&&(P=n),gt(),z&&(z=!1,Z(ht()))}).catch(t=>{t instanceof c||(console.error(t),e.disposed||Z(`Update failed: ${je(t)}`))}).finally(()=>{n===Je&&($=!1)})}var V=0,Xe=0,H=new Set;window.addEventListener(`keydown`,e=>{let t=e.key.toLowerCase();if(t===`g`){tt(x===`gpu`?`cpu`:`gpu`);return}H.add(t)}),window.addEventListener(`keyup`,e=>H.delete(e.key.toLowerCase())),document.addEventListener(`visibilitychange`,()=>{document.visibilityState===`visible`&&(R=performance.now())});var U=he({title:`Infinite world`,info:`Unbounded landmark level + world-anchored rock cells streamed around a flying camera. Steer with A/D or arrow keys.`}),Ze=document.createElement(`style`);Ze.textContent=`
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
`,document.head.appendChild(Ze);var Qe=U.el.querySelector(`.pcg-stats`)?.previousElementSibling??U.el;U.addSeed(v,e=>{v=e,B()}),U.addSlider(`Speed`,{min:0,max:80,step:1,value:y,format:e=>`${e} u/s`},e=>{y=e}),U.addSlider(`Gen radius`,{min:60,max:240,step:10,value:b,format:e=>`${e} u`},e=>{b=e,B()}),U.addSlider(`Cell size`,{min:20,max:80,step:20,value:C,format:e=>`${e} u`},e=>{C=e,Fe(),B()}),U.addCheckbox(`World-anchored`,w,e=>{w=e,mt(),B()}),U.addCheckbox(`Halo (4 u)`,T,e=>{T=e,B()}),U.addCheckbox(`Cell grid`,E,e=>{E=e,k&&(k.visible=e),Ie()});var W=document.createElement(`div`);W.className=`pcg04-seg`;var G=document.createElement(`button`);G.type=`button`,G.textContent=`GPU per-node`;var K=document.createElement(`button`);K.type=`button`,K.textContent=`CPU`,W.append(G,K);var q=document.createElement(`p`);q.className=`pcg04-hint`,q.textContent=`G switches path · A/D or ←/→ steer`;var $e=document.createElement(`div`);$e.className=`pcg-row`;var et=document.createElement(`label`);et.textContent=`Derived specs`;var J=document.createElement(`input`);J.type=`checkbox`,J.checked=S,J.addEventListener(`change`,()=>{S=J.checked,B()}),$e.append(et,J),Qe.prepend(W,q,$e);function tt(e){if(e!==x){if(e===`gpu`&&!F()){Z(N?Q():M??`GPU path not ready yet.`);return}x=e,Y(),B(),Z(ht())}}G.addEventListener(`click`,()=>tt(`gpu`)),K.addEventListener(`click`,()=>tt(`cpu`));function Y(){G.setAttribute(`aria-pressed`,String(x===`gpu`)),K.setAttribute(`aria-pressed`,String(x===`cpu`)),G.disabled=!F(),G.title=M===void 0?N?Q():``:M,J.disabled=!F()||x===`cpu`}var X=U.addStat(`Adapter`),nt=U.addStat(`FPS`),rt=U.addStat(`Rock source`),it=U.addStat(`Rock cells`),at=U.addStat(`Cooked / evicted`),ot=U.addStat(`Pending`),st=U.addStat(`Instances`),ct=U.addStat(`Position`),lt=U.addStat(`Cook`),ut=U.addStat(`Resident runs / fused members`),dt=U.addStat(`Device dispatches`),ft=U.addStat(`GPU fallbacks`),pt=U.addStat(`Status`);function Z(e){pt(e)}function mt(){rt(w?`pointScatterInWorld`:`pointScatterInBounds`)}function Q(){return`Device lost (${Ve}) — the GPU path is disabled; reload for a fresh device`}function ht(){return N?Q():x===`cpu`?`CPU path — no resolver passed to the cook`:F()?S?`GPU per-node — combinator fields accepted via acceptDerivedSpecs`:`GPU per-node — acceptDerivedSpecs off, so every field falls back`:M??`Requesting WebGPU adapter…`}function gt(){if(lt(L===void 0?`–`:`${L.toFixed(1)} ms`),P===void 0){ut(I?.tap===void 0?`– (no GPU resolver)`:`–`),dt(`–`),ft(`–`);return}ut(`${P.residentRuns} / ${P.fusedNodes}`),dt(String(P.dispatches)),ft(Ee(P.fallbacks))}var _t=U.addSlot();ce(),U.addNote(`Drag “Cell size”: the blue grid re-cells the world and the rocks do not move or resize. Untick “Halo” to watch every border grow a band of undersized rocks, and “World-anchored” to watch the same drag re-roll the world from scratch.`);var vt=U.addCollapsible(`Anchoring · what the fine level actually does`);vt.textContent=`pointScatterInWorld scatters over an INFINITE lattice fixed to
world coordinates and returns the points inside the query
window. Position and per-point seed are a pure function of the
node seed, the seed param, the lattice mode, the lattice cellSize
and the point's own lattice cell and index — never of the window.
Three consequences, and this page leans on all three:

  1  The window only SELECTS. Re-cell the world (the cell size
     slider) and the same rocks come back, because nothing in
     their derivation ever saw a cell.
  2  A halo is just a wider query. Each rock's SIZE comes from
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
  3  A cell never asks a sibling for anything. It derives the
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

Unticking "World-anchored" swaps in pointScatterInBounds over
the identical window, at the same expected population. Its
positions are a function OF the window, so the halo reproduces
nothing: every rock re-rolls when the partition changes, and
each cell measures its seams against neighbours the cell next
door has never heard of. Deterministic, still — and useless for
anything that has to see past its own bounds.`;var yt=U.addCollapsible(`Diagnostics · why nothing fuses here`);yt.textContent=`Resident runs / fused members reads 0 / 0 on BOTH paths, and
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

Reading the numbers: "Cook" is UpdateStats.elapsedMs, the wall time
of one budgeted update, which may cook several cells or none. World
discards each cell's CookStats, so the three counters under it are
summed from the CookStats.gpu objects captured by the resolver tap
over that same update, and hold their last non-empty value when an
update cooks nothing.`;function bt(e){N=!0,Ve=e,j=`Device lost`,X(j),Z(Q()),Y(),x===`gpu`&&(x=`cpu`,Y(),B())}async function xt(){let e=await Ce(bt);if(`error`in e){M=e.error,j=`No WebGPU adapter`,X(j),x=`cpu`,Y(),Z(`${e.error} Running the CPU path.`);return}try{let t=we(e);A=t.derived,Be=t.strict}catch(e){M=`GpuFieldEvaluator construction failed: ${je(e)}`,j=`Evaluator unavailable`,X(j),x=`cpu`,Y(),Z(`${M} Running the CPU path.`);return}N||(j=e.label,X(j),Y(),Z(ht()),x===`gpu`&&B())}var $=!1,St=g(e=>nt(e));X(j),Z(`Requesting WebGPU adapter…`),Y(),mt(),gt(),Fe(),B(),xt(),Me(e=>{St(),Xe=(H.has(`a`)||H.has(`arrowleft`)?1:0)-(H.has(`d`)||H.has(`arrowright`)?1:0),V+=Xe*1.1*e,O.position.x+=Math.sin(V)*y*e,O.position.z+=Math.cos(V)*y*e,O.position.y=26,O.lookAt(O.position.x+Math.sin(V)*60,5,O.position.z+Math.cos(V)*60),Ie();let t=I;if(t&&!$?Ye(t,De):$&&!z&&performance.now()-R>Ae&&(z=!0,Z(`A cook has been in flight for over 5 s — the GPU device may have been lost.`)),t){let e=t.world.stats(),n=e.levels.find(e=>e.name===`rocks`)?.cellCount??0;it(String(n)),at(`${e.totalCooked} / ${e.totalEvicted}`),ot(String(qe));let r=0;for(let e of t.cellInstances.values())r+=e;st(String(r)),ct(`${O.position.x.toFixed(0)}, ${O.position.z.toFixed(0)}`)}});