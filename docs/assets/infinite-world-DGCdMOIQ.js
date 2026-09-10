import{$n as e,An as t,Dr as n,En as r,Ft as i,Gr as a,Kn as o,Ln as s,Lt as ee,Yr as c,bi as te,br as l,ei as ne,hn as re,ii as ie,kn as ae,lr as oe,mn as se,r as ce,ti as le,yr as ue}from"./wordmark-B4V2K-F_.js";import{t as de}from"./types-C9vZymIy.js";import{A as u,Ht as d,St as f,U as p,W as m,jt as h,q as g}from"./three.core-auuZCBBV.js";import{t as _}from"./fps-BGOI9Z95.js";import{t as v}from"./scene-BYRX2PP5.js";import{t as fe}from"./gpu-CkPJh1bl.js";import{r as pe}from"./three-BCKtGykb.js";import{n as me,t as he}from"./panel-R4umELMp.js";var ge=.35,_e=777;function ve(){let e=new o,t=e.add(se,{count:170,boundsMin:[-800,0,-800],boundsMax:[800,0,800]}),n=e.add(s,{name:`scale`,tupleSize:3,value:(()=>{let e=c(ie(`mega`),0,1,5,13);return ne(e,a(e,1.6),e)})()}),r=e.add(ee,{assetId:`megarock`});return e.connect(t,`out`,n,`in`),e.connect(n,`out`,r,`in`),e.output(r,`instances`,`instances`),{name:`landmarks`,cellSize:`unbounded`,generationRadius:1/0,graph:e,bind(e,r){e.setParam(t,`seed`,r.seed),e.setParam(n,`seed`,te(r.seed,9))}}}function ye(i){let{cellSize:l,generationRadius:ce,anchored:ue}=i,u=i.halo?4:0,d=new o,f=ue?d.add(re,{density:ge,cellSize:7,latticeMode:`xz`,height:0}):d.add(se,{count:Math.round(ge*(l+2*u)**2)}),p=d.add(s,{name:`density`,tupleSize:1,value:c(e(oe,{seed:_e,frequency:.02,octaves:3}),-1,1,0,1)}),m=d.add(t,{mode:`probabilistic`}),h=d.add(r,{radius:4,countAttr:`nbrCount`}),g=d.add(ae,{mode:`inside`}),_=d.add(s,{name:`scale`,tupleSize:3,value:(()=>{let e=c(n(le(`nbrCount`),2,16),2,16,.4,1.35),t=a(e,c(ie(`rock`),0,1,.85,1.15));return ne(t,t,t)})()}),v=d.add(ee,{assetId:`rock`});return d.connect(f,`out`,p,`in`),d.connect(p,`out`,m,`in`),d.connect(m,`out`,h,`in`),d.connect(h,`out`,g,`in`),d.connect(g,`out`,_,`in`),d.connect(_,`out`,v,`in`),d.output(v,`instances`,`instances`),{name:`rocks`,cellSize:l,generationRadius:ce,graph:d,bind(e,t){let{min:n,max:r}=de(t);e.setParam(f,`boundsMin`,[n[0]-u,0,n[1]-u]),e.setParam(f,`boundsMax`,[r[0]+u,0,r[1]+u]);let i=ue?t.worldSeed:t.seed;e.setParam(f,`seed`,i),e.setParam(m,`seed`,te(i,1)),e.setParam(_,`seed`,te(i,2)),e.setParam(g,`boundsMin`,[n[0],-1,n[1]]),e.setParam(g,`boundsMax`,[r[0],1,r[1]])}}}function be(e){return e instanceof Error?e.message:String(e)}function xe(e){let t=(e?.description??``)===``?e?.device:e?.description;return[e?.vendor,e?.architecture,t].filter(e=>typeof e==`string`&&e!==``).join(` · `)||`adapter (no info exposed)`}async function Se(e){let t=navigator.gpu;if(t===void 0)return{error:`navigator.gpu is missing — this browser has no WebGPU.`};try{let n=await t.requestAdapter();if(n===null)return{error:`navigator.gpu.requestAdapter() returned null — no compatible GPU adapter.`};let r=n.info,i=await n.requestDevice(),a=i.lost;return a!==void 0&&a.then(t=>{e(`${t?.reason??`unknown`}: ${t?.message??`no detail`}`)}),{device:i,info:r,label:xe(r)}}catch(e){return{error:`requestDevice() failed: ${be(e)}`}}}function Ce(e){let t=e.info===void 0?{}:{adapterInfo:e.info};return{derived:new fe(e.device,{...t,acceptDerivedSpecs:!0}),strict:new fe(e.device,t)}}var we=class{cacheSalt;residentTerminals;acceptDerivedSpecs;base;seen=new Set;constructor(e){this.base=e,this.cacheSalt=e.cacheSalt,this.residentTerminals=e.residentTerminals,this.acceptDerivedSpecs=e.acceptDerivedSpecs}resolveField(e,t,n){return n!==void 0&&this.seen.add(n),this.base.resolveField(e,t,n)}planRun(e,t,n){return n!==void 0&&this.seen.add(n),this.base.planRun(e,t,n)}executeRun(e,t,n){return n!==void 0&&this.seen.add(n),this.base.executeRun(e,t,n)}drain(){if(this.seen.size===0)return;let e=l();for(let t of this.seen){e.dispatches+=t.dispatches,e.pipelinesCompiled+=t.pipelinesCompiled,e.pipelineCacheHits+=t.pipelineCacheHits,e.residentRuns+=t.residentRuns,e.fusedNodes+=t.fusedNodes,e.readbacksSaved+=t.readbacksSaved;for(let[n,r]of Object.entries(t.fallbacks))e.fallbacks[n]=(e.fallbacks[n]??0)+r}return this.seen.clear(),e}};function Te(e){let t=Object.entries(e).sort(([e],[t])=>e.localeCompare(t));return t.length===0?`none`:t.map(([e,t])=>`${e} ×${t}`).join(`, `)}var Ee=1,y=18,b=140,x=`gpu`,S=!0,C=20,w=!0,T=!0,E=!0,De=7,Oe=12,ke=8,Ae=5e3;function je(e){return e instanceof Error?e.message:String(e)}var{scene:D,camera:O,start:Me}=v({cameraPosition:[0,26,0],orbit:!1,fog:{near:140,far:640},far:1600}),k=new f(new d(4e3,4e3),new h({color:1449515,roughness:1}));k.rotation.x=-Math.PI/2,k.position.y=-.03,D.add(k);var Ne=40,A;function Pe(){A&&(D.remove(A),A.geometry.dispose(),A.material.dispose());let e=new p(C*Ne,Ne,4158656,2903936),t=e.material;t.transparent=!0,t.opacity=.45,t.depthWrite=!1,e.position.y=.02,e.visible=E,D.add(e),A=e}function Fe(){!A||!A.visible||(A.position.x=Math.round(O.position.x/C)*C,A.position.z=Math.round(O.position.z/C)*C)}var Ie=new h({color:8028816,roughness:.95,flatShading:!0}),Le=new h({color:6121077,roughness:1,flatShading:!0}),Re={megarock:{geometry:new u(1).translate(0,.62,0),material:Le},rock:{geometry:new g(.55).translate(0,.33,0),material:Ie}},ze,Be,j=`requesting…`,M,N=!1,Ve=``,P;function F(){return ze!==void 0&&!N}function He(){if(!(x===`cpu`||!F()))return S?ze:Be}var I;function Ue(e,t){let n=[{name:`landmarks`,graph:e},{name:`rocks`,graph:t}];I?I.set(n):I=he(n,{into:_t,title:`infinite world`})}function We(e,t){let n=e*1.25/t+1.5;return Math.max(256,Math.ceil(Math.PI*n*n))}function Ge(e){let t=0;for(let n of Object.keys(e))for(let r of e[n])if(r.kind===`instances`)for(let e of r.batches)t+=e.count;return t}var L,R=0,z,B=0,V=!1,Ke=0;function H(){L&&(L.disposed=!0,L.abort.abort(),L.binding.dispose(),D.remove(L.group));let e=new m;D.add(e);let t=new pe({group:e,assets:Re}),n=new Map,r=He(),a={world:void 0,group:e,binding:t,cellInstances:n,tap:r===void 0?void 0:new we(r),abort:new AbortController,disposed:!1},o=[ve(),ye({cellSize:C,generationRadius:b,anchored:w,halo:T})];Ue(o[0].graph,o[1].graph),a.world=new i({seed:Ee,levels:o,maxCellsPerLevel:We(b,C),...a.tap===void 0?{}:{gpu:a.tap},onCellReady:(e,r,i)=>{a.disposed||(t.cellReady(e,r,i),n.set(`${e}|${r[0]},${r[1]}`,Ge(i)))},onCellEvicted:(e,r)=>{a.disposed||(t.cellEvicted(e,r),n.delete(`${e}|${r[0]},${r[1]}`))}}),L=a,R=0,P=void 0,z=void 0,gt(),qe(a,Oe)}function qe(e,t){let n=++Ke;$=!0,B=performance.now(),e.world.update([O.position.x,0,O.position.z],{budgetMs:t,maxCooksPerUpdate:ke,signal:e.abort.signal,...e.tap===void 0?{}:{gpu:e.tap}}).then(t=>{if(e.disposed)return;R=t.pending,z=t.elapsedMs;let n=e.tap?.drain();n!==void 0&&(P=n),gt(),V&&(V=!1,Z(ht()))}).catch(t=>{t instanceof ue||(console.error(t),e.disposed||Z(`update failed: ${je(t)}`))}).finally(()=>{n===Ke&&($=!1)})}var U=0,Je=0,W=new Set;window.addEventListener(`keydown`,e=>{let t=e.key.toLowerCase();if(t===`g`){tt(x===`gpu`?`cpu`:`gpu`);return}W.add(t)}),window.addEventListener(`keyup`,e=>W.delete(e.key.toLowerCase())),document.addEventListener(`visibilitychange`,()=>{document.visibilityState===`visible`&&(B=performance.now())});var G=me({title:`infinite world`,info:`Unbounded landmark level + world-anchored rock cells streamed around a flying camera. Steer with A/D or arrow keys.`}),Ye=document.createElement(`style`);Ye.textContent=`
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
`,document.head.appendChild(Ye);var Xe=G.el.querySelector(`.pcg-stats`)?.previousElementSibling??G.el;G.addSeed(Ee,e=>{Ee=e,H()}),G.addSlider(`speed`,{min:0,max:80,step:1,value:y,format:e=>`${e} u/s`},e=>{y=e}),G.addSlider(`gen radius`,{min:60,max:240,step:10,value:b,format:e=>`${e} u`},e=>{b=e,H()}),G.addSlider(`cell size`,{min:20,max:80,step:20,value:C,format:e=>`${e} u`},e=>{C=e,Pe(),H()}),G.addCheckbox(`world-anchored`,w,e=>{w=e,mt(),H()}),G.addCheckbox(`halo (4 u)`,T,e=>{T=e,H()}),G.addCheckbox(`cell grid`,E,e=>{E=e,A&&(A.visible=e),Fe()});var Ze=document.createElement(`div`);Ze.className=`pcg04-seg`;var K=document.createElement(`button`);K.type=`button`,K.textContent=`GPU per-node`;var q=document.createElement(`button`);q.type=`button`,q.textContent=`CPU`,Ze.append(K,q);var Qe=document.createElement(`p`);Qe.className=`pcg04-hint`,Qe.textContent=`G switches path · A/D or ←/→ steer`;var $e=document.createElement(`div`);$e.className=`pcg-row`;var et=document.createElement(`label`);et.textContent=`derived specs`;var J=document.createElement(`input`);J.type=`checkbox`,J.checked=S,J.addEventListener(`change`,()=>{S=J.checked,H()}),$e.append(et,J),Xe.prepend(Ze,Qe,$e);function tt(e){if(e!==x){if(e===`gpu`&&!F()){Z(N?Q():M??`GPU path not ready yet.`);return}x=e,Y(),H(),Z(ht())}}K.addEventListener(`click`,()=>tt(`gpu`)),q.addEventListener(`click`,()=>tt(`cpu`));function Y(){K.setAttribute(`aria-pressed`,String(x===`gpu`)),q.setAttribute(`aria-pressed`,String(x===`cpu`)),K.disabled=!F(),K.title=M===void 0?N?Q():``:M,J.disabled=!F()||x===`cpu`}var X=G.addStat(`adapter`),nt=G.addStat(`fps`),rt=G.addStat(`rock source`),it=G.addStat(`rock cells`),at=G.addStat(`cooked / evicted`),ot=G.addStat(`pending`),st=G.addStat(`instances`),ct=G.addStat(`position`),lt=G.addStat(`cook`),ut=G.addStat(`resident runs / fused members`),dt=G.addStat(`device dispatches`),ft=G.addStat(`gpu fallbacks`),pt=G.addStat(`status`);function Z(e){pt(e)}function mt(){rt(w?`pointScatterInWorld`:`pointScatterInBounds`)}function Q(){return`device lost (${Ve}) — the GPU path is disabled; reload for a fresh device`}function ht(){return N?Q():x===`cpu`?`CPU path — no resolver passed to the cook`:F()?S?`GPU per-node — combinator fields accepted via acceptDerivedSpecs`:`GPU per-node — acceptDerivedSpecs off, so every field falls back`:M??`requesting WebGPU adapter…`}function gt(){if(lt(z===void 0?`–`:`${z.toFixed(1)} ms`),P===void 0){ut(L?.tap===void 0?`– (no GPU resolver)`:`–`),dt(`–`),ft(`–`);return}ut(`${P.residentRuns} / ${P.fusedNodes}`),dt(String(P.dispatches)),ft(Te(P.fallbacks))}var _t=G.addSlot();ce(),G.addNote(`Drag “cell size”: the blue grid re-cells the world and the rocks do not move or resize. Untick “halo” to watch every border grow a band of undersized rocks, and “world-anchored” to watch the same drag re-roll the world from scratch.`);var vt=G.addCollapsible(`anchoring · what the fine level actually does`);vt.textContent=`pointScatterInWorld scatters over an INFINITE lattice fixed to
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
anything that has to see past its own bounds.`;var yt=G.addCollapsible(`diagnostics · why nothing fuses here`);yt.textContent=`resident runs / fused members reads 0 / 0 on BOTH paths, and
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
update cooks nothing.`;function bt(e){N=!0,Ve=e,j=`device lost`,X(j),Z(Q()),Y(),x===`gpu`&&(x=`cpu`,Y(),H())}async function xt(){let e=await Se(bt);if(`error`in e){M=e.error,j=`no WebGPU adapter`,X(j),x=`cpu`,Y(),Z(`${e.error} Running the CPU path.`);return}try{let t=Ce(e);ze=t.derived,Be=t.strict}catch(e){M=`GpuFieldEvaluator construction failed: ${je(e)}`,j=`evaluator unavailable`,X(j),x=`cpu`,Y(),Z(`${M} Running the CPU path.`);return}N||(j=e.label,X(j),Y(),Z(ht()),x===`gpu`&&H())}var $=!1,St=_(e=>nt(e));X(j),Z(`requesting WebGPU adapter…`),Y(),mt(),gt(),Pe(),H(),xt(),Me(e=>{St(),Je=(W.has(`a`)||W.has(`arrowleft`)?1:0)-(W.has(`d`)||W.has(`arrowright`)?1:0),U+=Je*1.1*e,O.position.x+=Math.sin(U)*y*e,O.position.z+=Math.cos(U)*y*e,O.position.y=26,O.lookAt(O.position.x+Math.sin(U)*60,5,O.position.z+Math.cos(U)*60),Fe();let t=L;if(t&&!$?qe(t,De):$&&!V&&performance.now()-B>Ae&&(V=!0,Z(`a cook has been in flight for over 5 s — the GPU device may have been lost.`)),t){let e=t.world.stats(),n=e.levels.find(e=>e.name===`rocks`)?.cellCount??0;it(String(n)),at(`${e.totalCooked} / ${e.totalEvicted}`),ot(String(R));let r=0;for(let e of t.cellInstances.values())r+=e;st(String(r)),ct(`${O.position.x.toFixed(0)}, ${O.position.z.toFixed(0)}`)}});