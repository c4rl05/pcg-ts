import{Ci as e,Ft as t,Jn as n,Jr as r,Lt as i,Mn as a,On as o,Qr as s,Sr as c,dr as ee,gn as te,hn as ne,ii as re,jn as ie,kr as ae,r as oe,ri as se,si as ce,tr as le,xr as l,zn as u}from"./wordmark-B5vsvRY6.js";import{t as ue}from"./types-C9vZymIy.js";import{A as d,Ht as f,St as p,U as de,W as m,jt as h,q as g}from"./three.core-auuZCBBV.js";import{t as _}from"./fps-BGOI9Z95.js";import{t as v}from"./scene-BYRX2PP5.js";import{t as fe}from"./gpu-CaESvhOb.js";import{r as pe}from"./three-BkVhqQSJ.js";import{n as me,t as he}from"./panel-BzF9njoJ.js";var ge=.35,_e=777;function ve(){let t=new n,a=t.add(ne,{count:170,boundsMin:[-800,0,-800],boundsMax:[800,0,800]}),o=t.add(u,{name:`scale`,tupleSize:3,value:(()=>{let e=s(ce(`mega`),0,1,5,13);return se(e,r(e,1.6),e)})()}),c=t.add(i,{assetId:`megarock`});return t.connect(a,`out`,o,`in`),t.connect(o,`out`,c,`in`),t.output(c,`instances`,`instances`),{name:`landmarks`,cellSize:`unbounded`,generationRadius:1/0,graph:t,bind(t,n){t.setParam(a,`seed`,n.seed),t.setParam(o,`seed`,e(n.seed,9))}}}function ye(t){let{cellSize:c,generationRadius:oe,anchored:l}=t,d=t.halo?4:0,f=new n,p=l?f.add(te,{density:ge,cellSize:7,latticeMode:`xz`,height:0}):f.add(ne,{count:Math.round(ge*(c+2*d)**2)}),de=f.add(u,{name:`density`,tupleSize:1,value:s(le(ee,{seed:_e,frequency:.02,octaves:3}),-1,1,0,1)}),m=f.add(a,{mode:`probabilistic`}),h=f.add(o,{radius:4,countAttr:`nbrCount`}),g=f.add(ie,{mode:`inside`}),_=f.add(u,{name:`scale`,tupleSize:3,value:(()=>{let e=s(ae(re(`nbrCount`),2,16),2,16,.4,1.35),t=r(e,s(ce(`rock`),0,1,.85,1.15));return se(t,t,t)})()}),v=f.add(i,{assetId:`rock`});return f.connect(p,`out`,de,`in`),f.connect(de,`out`,m,`in`),f.connect(m,`out`,h,`in`),f.connect(h,`out`,g,`in`),f.connect(g,`out`,_,`in`),f.connect(_,`out`,v,`in`),f.output(v,`instances`,`instances`),{name:`rocks`,cellSize:c,generationRadius:oe,graph:f,bind(t,n){let{min:r,max:i}=ue(n);t.setParam(p,`boundsMin`,[r[0]-d,0,r[1]-d]),t.setParam(p,`boundsMax`,[i[0]+d,0,i[1]+d]);let a=l?n.worldSeed:n.seed;t.setParam(p,`seed`,a),t.setParam(m,`seed`,e(a,1)),t.setParam(_,`seed`,e(a,2)),t.setParam(g,`boundsMin`,[r[0],-1,r[1]]),t.setParam(g,`boundsMax`,[i[0],1,i[1]])}}}function be(e){return e instanceof Error?e.message:String(e)}function xe(e){let t=(e?.description??``)===``?e?.device:e?.description;return[e?.vendor,e?.architecture,t].filter(e=>typeof e==`string`&&e!==``).join(` · `)||`adapter (no info exposed)`}async function Se(e){let t=navigator.gpu;if(t===void 0)return{error:`navigator.gpu is missing — this browser has no WebGPU.`};try{let n=await t.requestAdapter();if(n===null)return{error:`navigator.gpu.requestAdapter() returned null — no compatible GPU adapter.`};let r=n.info,i=await n.requestDevice(),a=i.lost;return a!==void 0&&a.then(t=>{e(`${t?.reason??`unknown`}: ${t?.message??`no detail`}`)}),{device:i,info:r,label:xe(r)}}catch(e){return{error:`requestDevice() failed: ${be(e)}`}}}function Ce(e){let t=e.info===void 0?{}:{adapterInfo:e.info};return{derived:new fe(e.device,{...t,acceptDerivedSpecs:!0}),strict:new fe(e.device,t)}}var we=class{cacheSalt;residentTerminals;acceptDerivedSpecs;base;seen=new Set;constructor(e){this.base=e,this.cacheSalt=e.cacheSalt,this.residentTerminals=e.residentTerminals,this.acceptDerivedSpecs=e.acceptDerivedSpecs}resolveField(e,t,n){return n!==void 0&&this.seen.add(n),this.base.resolveField(e,t,n)}planRun(e,t,n){return n!==void 0&&this.seen.add(n),this.base.planRun(e,t,n)}executeRun(e,t,n){return n!==void 0&&this.seen.add(n),this.base.executeRun(e,t,n)}drain(){if(this.seen.size===0)return;let e=c();for(let t of this.seen){e.dispatches+=t.dispatches,e.pipelinesCompiled+=t.pipelinesCompiled,e.pipelineCacheHits+=t.pipelineCacheHits,e.residentRuns+=t.residentRuns,e.fusedNodes+=t.fusedNodes,e.readbacksSaved+=t.readbacksSaved;for(let[n,r]of Object.entries(t.fallbacks))e.fallbacks[n]=(e.fallbacks[n]??0)+r}return this.seen.clear(),e}};function Te(e){let t=Object.entries(e).sort(([e],[t])=>e.localeCompare(t));return t.length===0?`none`:t.map(([e,t])=>`${e} ×${t}`).join(`, `)}var Ee=1,y=18,b=140,x=`gpu`,S=!0,C=20,w=!0,De=!0,Oe=!0,ke=7,Ae=12,je=8,Me=5e3;function Ne(e){return e instanceof Error?e.message:String(e)}var{scene:T,camera:E,start:Pe}=v({cameraPosition:[0,26,0],orbit:!1,fog:{near:140,far:640},far:1600}),D=new p(new f(4e3,4e3),new h({color:1449515,roughness:1}));D.rotation.x=-Math.PI/2,D.position.y=-.03,T.add(D);var Fe=40,O;function Ie(){O&&(T.remove(O),O.geometry.dispose(),O.material.dispose());let e=new de(C*Fe,Fe,4158656,2903936),t=e.material;t.transparent=!0,t.opacity=.45,t.depthWrite=!1,e.position.y=.02,e.visible=Oe,T.add(e),O=e}function Le(){!O||!O.visible||(O.position.x=Math.round(E.position.x/C)*C,O.position.z=Math.round(E.position.z/C)*C)}var Re=new h({color:8028816,roughness:.95,flatShading:!0}),ze=new h({color:6121077,roughness:1,flatShading:!0}),Be={megarock:{geometry:new d(1).translate(0,.62,0),material:ze},rock:{geometry:new g(.55).translate(0,.33,0),material:Re}},k,Ve,A=`requesting…`,j,M=!1,He=``,N;function P(){return k!==void 0&&!M}function Ue(){if(!(x===`cpu`||!P()))return S?k:Ve}var We;function Ge(e,t){let n=[{name:`landmarks`,graph:e},{name:`rocks`,graph:t}];We?We.set(n):We=he(n,{into:_t,title:`infinite world`})}function Ke(e,t){let n=e*1.25/t+1.5;return Math.max(256,Math.ceil(Math.PI*n*n))}function qe(e){let t=0;for(let n of Object.keys(e))for(let r of e[n])if(r.kind===`instances`)for(let e of r.batches)t+=e.count;return t}var F,Je=0,I,Ye=0,L=!1,Xe=0;function R(){F&&(F.disposed=!0,F.abort.abort(),F.binding.dispose(),T.remove(F.group));let e=new m;T.add(e);let n=new pe({group:e,assets:Be}),r=new Map,i=Ue(),a={world:void 0,group:e,binding:n,cellInstances:r,tap:i===void 0?void 0:new we(i),abort:new AbortController,disposed:!1},o=[ve(),ye({cellSize:C,generationRadius:b,anchored:w,halo:De})];Ge(o[0].graph,o[1].graph),a.world=new t({seed:Ee,levels:o,maxCellsPerLevel:Ke(b,C),...a.tap===void 0?{}:{gpu:a.tap},onCellReady:(e,t,i)=>{a.disposed||(n.cellReady(e,t,i),r.set(`${e}|${t[0]},${t[1]}`,qe(i)))},onCellEvicted:(e,t)=>{a.disposed||(n.cellEvicted(e,t),r.delete(`${e}|${t[0]},${t[1]}`))}}),F=a,Je=0,N=void 0,I=void 0,gt(),Ze(a,Ae)}function Ze(e,t){let n=++Xe;$=!0,Ye=performance.now(),e.world.update([E.position.x,0,E.position.z],{budgetMs:t,maxCooksPerUpdate:je,signal:e.abort.signal,...e.tap===void 0?{}:{gpu:e.tap}}).then(t=>{if(e.disposed)return;Je=t.pending,I=t.elapsedMs;let n=e.tap?.drain();n!==void 0&&(N=n),gt(),L&&(L=!1,Z(ht()))}).catch(t=>{t instanceof l||(console.error(t),e.disposed||Z(`update failed: ${Ne(t)}`))}).finally(()=>{n===Xe&&($=!1)})}var z=0,Qe=0,B=new Set;window.addEventListener(`keydown`,e=>{let t=e.key.toLowerCase();if(t===`g`){J(x===`gpu`?`cpu`:`gpu`);return}B.add(t)}),window.addEventListener(`keyup`,e=>B.delete(e.key.toLowerCase())),document.addEventListener(`visibilitychange`,()=>{document.visibilityState===`visible`&&(Ye=performance.now())});var V=me({title:`infinite world`,info:`Unbounded landmark level + world-anchored rock cells streamed around a flying camera. Steer with A/D or arrow keys.`}),$e=document.createElement(`style`);$e.textContent=`
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
`,document.head.appendChild($e);var et=V.el.querySelector(`.pcg-stats`)?.previousElementSibling??V.el;V.addSeed(Ee,e=>{Ee=e,R()}),V.addSlider(`speed`,{min:0,max:80,step:1,value:y,format:e=>`${e} u/s`},e=>{y=e}),V.addSlider(`gen radius`,{min:60,max:240,step:10,value:b,format:e=>`${e} u`},e=>{b=e,R()}),V.addSlider(`cell size`,{min:20,max:80,step:20,value:C,format:e=>`${e} u`},e=>{C=e,Ie(),R()}),V.addCheckbox(`world-anchored`,w,e=>{w=e,mt(),R()}),V.addCheckbox(`halo (4 u)`,De,e=>{De=e,R()}),V.addCheckbox(`cell grid`,Oe,e=>{Oe=e,O&&(O.visible=e),Le()});var H=document.createElement(`div`);H.className=`pcg04-seg`;var U=document.createElement(`button`);U.type=`button`,U.textContent=`GPU per-node`;var W=document.createElement(`button`);W.type=`button`,W.textContent=`CPU`,H.append(U,W);var G=document.createElement(`p`);G.className=`pcg04-hint`,G.textContent=`G switches path · A/D or ←/→ steer`;var K=document.createElement(`div`);K.className=`pcg-row`;var tt=document.createElement(`label`);tt.textContent=`derived specs`;var q=document.createElement(`input`);q.type=`checkbox`,q.checked=S,q.addEventListener(`change`,()=>{S=q.checked,R()}),K.append(tt,q),et.prepend(H,G,K);function J(e){if(e!==x){if(e===`gpu`&&!P()){Z(M?Q():j??`GPU path not ready yet.`);return}x=e,Y(),R(),Z(ht())}}U.addEventListener(`click`,()=>J(`gpu`)),W.addEventListener(`click`,()=>J(`cpu`));function Y(){U.setAttribute(`aria-pressed`,String(x===`gpu`)),W.setAttribute(`aria-pressed`,String(x===`cpu`)),U.disabled=!P(),U.title=j===void 0?M?Q():``:j,q.disabled=!P()||x===`cpu`}var X=V.addStat(`adapter`),nt=V.addStat(`fps`),rt=V.addStat(`rock source`),it=V.addStat(`rock cells`),at=V.addStat(`cooked / evicted`),ot=V.addStat(`pending`),st=V.addStat(`instances`),ct=V.addStat(`position`),lt=V.addStat(`cook`),ut=V.addStat(`resident runs / fused members`),dt=V.addStat(`device dispatches`),ft=V.addStat(`gpu fallbacks`),pt=V.addStat(`status`);function Z(e){pt(e)}function mt(){rt(w?`pointScatterInWorld`:`pointScatterInBounds`)}function Q(){return`device lost (${He}) — the GPU path is disabled; reload for a fresh device`}function ht(){return M?Q():x===`cpu`?`CPU path — no resolver passed to the cook`:P()?S?`GPU per-node — combinator fields accepted via acceptDerivedSpecs`:`GPU per-node — acceptDerivedSpecs off, so every field falls back`:j??`requesting WebGPU adapter…`}function gt(){if(lt(I===void 0?`–`:`${I.toFixed(1)} ms`),N===void 0){ut(F?.tap===void 0?`– (no GPU resolver)`:`–`),dt(`–`),ft(`–`);return}ut(`${N.residentRuns} / ${N.fusedNodes}`),dt(String(N.dispatches)),ft(Te(N.fallbacks))}var _t=V.addSlot();oe(),V.addNote(`Drag “cell size”: the blue grid re-cells the world and the rocks do not move or resize. Untick “halo” to watch every border grow a band of undersized rocks, and “world-anchored” to watch the same drag re-roll the world from scratch.`);var vt=V.addCollapsible(`anchoring · what the fine level actually does`);vt.textContent=`pointScatterInWorld scatters over an INFINITE lattice fixed to
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
anything that has to see past its own bounds.`;var yt=V.addCollapsible(`diagnostics · why nothing fuses here`);yt.textContent=`resident runs / fused members reads 0 / 0 on BOTH paths, and
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
update cooks nothing.`;function bt(e){M=!0,He=e,A=`device lost`,X(A),Z(Q()),Y(),x===`gpu`&&(x=`cpu`,Y(),R())}async function xt(){let e=await Se(bt);if(`error`in e){j=e.error,A=`no WebGPU adapter`,X(A),x=`cpu`,Y(),Z(`${e.error} Running the CPU path.`);return}try{let t=Ce(e);k=t.derived,Ve=t.strict}catch(e){j=`GpuFieldEvaluator construction failed: ${Ne(e)}`,A=`evaluator unavailable`,X(A),x=`cpu`,Y(),Z(`${j} Running the CPU path.`);return}M||(A=e.label,X(A),Y(),Z(ht()),x===`gpu`&&R())}var $=!1,St=_(e=>nt(e));X(A),Z(`requesting WebGPU adapter…`),Y(),mt(),gt(),Ie(),R(),xt(),Pe(e=>{St(),Qe=(B.has(`a`)||B.has(`arrowleft`)?1:0)-(B.has(`d`)||B.has(`arrowright`)?1:0),z+=Qe*1.1*e,E.position.x+=Math.sin(z)*y*e,E.position.z+=Math.cos(z)*y*e,E.position.y=26,E.lookAt(E.position.x+Math.sin(z)*60,5,E.position.z+Math.cos(z)*60),Le();let t=F;if(t&&!$?Ze(t,ke):$&&!L&&performance.now()-Ye>Me&&(L=!0,Z(`a cook has been in flight for over 5 s — the GPU device may have been lost.`)),t){let e=t.world.stats(),n=e.levels.find(e=>e.name===`rocks`)?.cellCount??0;it(String(n)),at(`${e.totalCooked} / ${e.totalEvicted}`),ot(String(Je));let r=0;for(let e of t.cellInstances.values())r+=e;st(String(r)),ct(`${E.position.x.toFixed(0)}, ${E.position.z.toFixed(0)}`)}});