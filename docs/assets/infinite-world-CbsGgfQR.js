import{$s as e,Bo as t,Co as n,Hs as r,Mo as i,Qs as a,So as o,Ss as s,Xt as c,_a as ee,_t as l,an as u,bt as te,gn as d,gt as f,hs as p,ms as ne,nc as re,no as ie,pa as m,qo as ae,qs as h,r as oe,rs as se,rt as g,to as ce,vc as _,vo as le}from"./wordmark-CYtb6j31.js";import{t as ue}from"./types-C9vZymIy.js";import{t as v}from"./fps-BGOI9Z95.js";import{t as de}from"./scene-g3mUTKkL.js";import{r as fe}from"./three-CQcRLWl4.js";import{t as pe}from"./gpu-C8RfZ9KE.js";import{n as me,t as he}from"./panel-B5Cokg_e.js";var ge=.35,_e=777;function ve(){let e=new t,n=e.add(ce,{count:170,boundsMin:[-800,0,-800],boundsMax:[800,0,800]}),o=e.add(i,{name:`scale`,tupleSize:3,value:(()=>{let e=h(re(`mega`),0,1,5,13);return a(e,r(e,1.6),e)})()}),s=e.add(ee,{assetId:`megarock`});return e.connect(n,`out`,o,`in`),e.connect(o,`out`,s,`in`),e.output(s,`instances`,`instances`),{name:`landmarks`,cellSize:`unbounded`,generationRadius:1/0,graph:e,bind(e,t){e.setParam(n,`seed`,t.seed),e.setParam(o,`seed`,_(t.seed,9))}}}function ye(c){let{cellSize:l,generationRadius:u,anchored:te}=c,d=c.halo?4:0,f=new t,p=te?f.add(ie,{density:ge,cellSize:7,latticeMode:`xz`,height:0}):f.add(ce,{count:Math.round(ge*(l+2*d)**2)}),ne=f.add(i,{name:`density`,tupleSize:1,value:h(ae(se,{seed:_e,frequency:.02,octaves:3}),-1,1,0,1)}),m=f.add(n,{mode:`probabilistic`}),oe=f.add(le,{radius:4,countAttr:`nbrCount`}),g=f.add(o,{mode:`inside`}),v=f.add(i,{name:`scale`,tupleSize:3,value:(()=>{let t=h(s(e(`nbrCount`),2,16),2,16,.4,1.35),n=r(t,h(re(`rock`),0,1,.85,1.15));return a(n,n,n)})()}),de=f.add(ee,{assetId:`rock`});return f.connect(p,`out`,ne,`in`),f.connect(ne,`out`,m,`in`),f.connect(m,`out`,oe,`in`),f.connect(oe,`out`,g,`in`),f.connect(g,`out`,v,`in`),f.connect(v,`out`,de,`in`),f.output(de,`instances`,`instances`),{name:`rocks`,cellSize:l,generationRadius:u,graph:f,bind(e,t){let{min:n,max:r}=ue(t);e.setParam(p,`boundsMin`,[n[0]-d,0,n[1]-d]),e.setParam(p,`boundsMax`,[r[0]+d,0,r[1]+d]);let i=te?t.worldSeed:t.seed;e.setParam(p,`seed`,i),e.setParam(m,`seed`,_(i,1)),e.setParam(v,`seed`,_(i,2)),e.setParam(g,`boundsMin`,[n[0],-1,n[1]]),e.setParam(g,`boundsMax`,[r[0],1,r[1]])}}}function be(e){return e instanceof Error?e.message:String(e)}function xe(e){let t=(e?.description??``)===``?e?.device:e?.description;return[e?.vendor,e?.architecture,t].filter(e=>typeof e==`string`&&e!==``).join(` · `)||`Adapter (no info exposed)`}async function Se(e){let t=navigator.gpu;if(t===void 0)return{error:`navigator.gpu is missing — this browser has no WebGPU.`};try{let n=await t.requestAdapter();if(n===null)return{error:`navigator.gpu.requestAdapter() returned null — no compatible GPU adapter.`};let r=n.info,i=await n.requestDevice(),a=i.lost;return a!==void 0&&a.then(t=>{e(`${t?.reason??`unknown`}: ${t?.message??`no detail`}`)}),{device:i,info:r,label:xe(r)}}catch(e){return{error:`requestDevice() failed: ${be(e)}`}}}function Ce(e){let t=e.info===void 0?{}:{adapterInfo:e.info};return{derived:new pe(e.device,{...t,acceptDerivedSpecs:!0}),strict:new pe(e.device,t)}}var we=class{cacheSalt;residentTerminals;acceptDerivedSpecs;base;seen=new Set;constructor(e){this.base=e,this.cacheSalt=e.cacheSalt,this.residentTerminals=e.residentTerminals,this.acceptDerivedSpecs=e.acceptDerivedSpecs}resolveField(e,t,n){return n!==void 0&&this.seen.add(n),this.base.resolveField(e,t,n)}planRun(e,t,n){return n!==void 0&&this.seen.add(n),this.base.planRun(e,t,n)}executeRun(e,t,n){return n!==void 0&&this.seen.add(n),this.base.executeRun(e,t,n)}drain(){if(this.seen.size===0)return;let e=p();for(let t of this.seen){e.dispatches+=t.dispatches,e.pipelinesCompiled+=t.pipelinesCompiled,e.pipelineCacheHits+=t.pipelineCacheHits,e.residentRuns+=t.residentRuns,e.fusedNodes+=t.fusedNodes,e.readbacksSaved+=t.readbacksSaved;for(let[n,r]of Object.entries(t.fallbacks))e.fallbacks[n]=(e.fallbacks[n]??0)+r}return this.seen.clear(),e}};function Te(e){let t=Object.entries(e).sort(([e],[t])=>e.localeCompare(t));return t.length===0?`none`:t.map(([e,t])=>`${e} ×${t}`).join(`, `)}var Ee=1,y=18,b=140,x=`gpu`,S=!0,C=20,w=!0,De=!0,T=!0,Oe=7,ke=12,Ae=8,je=5e3;function Me(e){return e instanceof Error?e.message:String(e)}var{scene:E,camera:D,start:Ne}=de({cameraPosition:[0,26,0],orbit:!1,fog:{near:140,far:640},far:1600}),O=new c(new d(4e3,4e3),new u({color:1449515,roughness:1}));O.rotation.x=-Math.PI/2,O.position.y=-.03,E.add(O);var Pe=40,k;function Fe(){k&&(E.remove(k),k.geometry.dispose(),k.material.dispose());let e=new f(C*Pe,Pe,4158656,2903936),t=e.material;t.transparent=!0,t.opacity=.45,t.depthWrite=!1,e.position.y=.02,e.visible=T,E.add(e),k=e}function Ie(){!k||!k.visible||(k.position.x=Math.round(D.position.x/C)*C,k.position.z=Math.round(D.position.z/C)*C)}var Le=new u({color:8028816,roughness:.95,flatShading:!0}),Re=new u({color:6121077,roughness:1,flatShading:!0}),ze={megarock:{geometry:new g(1).translate(0,.62,0),material:Re},rock:{geometry:new te(.55).translate(0,.33,0),material:Le}},A,Be,j=`Requesting…`,M,N=!1,Ve=``,P;function F(){return A!==void 0&&!N}function He(){if(!(x===`cpu`||!F()))return S?A:Be}var Ue;function We(e,t){let n=[{name:`Landmarks`,graph:e},{name:`Rocks`,graph:t}];Ue?Ue.set(n):Ue=he(n,{into:_t,title:`Infinite world`})}function Ge(e,t){let n=e*1.25/t+1.5;return Math.max(256,Math.ceil(Math.PI*n*n))}function Ke(e){let t=0;for(let n of Object.keys(e))for(let r of e[n])if(r.kind===`instances`)for(let e of r.batches)t+=e.count;return t}var I,qe=0,L,R=0,z=!1,Je=0;function B(){I&&(I.disposed=!0,I.abort.abort(),I.binding.dispose(),E.remove(I.group));let e=new l;E.add(e);let t=new fe({group:e,assets:ze}),n=new Map,r=He(),i={world:void 0,group:e,binding:t,cellInstances:n,tap:r===void 0?void 0:new we(r),abort:new AbortController,disposed:!1},a=[ve(),ye({cellSize:C,generationRadius:b,anchored:w,halo:De})];We(a[0].graph,a[1].graph),i.world=new m({seed:Ee,levels:a,maxCellsPerLevel:Ge(b,C),...i.tap===void 0?{}:{gpu:i.tap},onCellReady:(e,r,a)=>{i.disposed||(t.cellReady(e,r,a),n.set(`${e}|${r[0]},${r[1]}`,Ke(a)))},onCellEvicted:(e,r)=>{i.disposed||(t.cellEvicted(e,r),n.delete(`${e}|${r[0]},${r[1]}`))}}),I=i,qe=0,P=void 0,L=void 0,gt(),Ye(i,ke)}function Ye(e,t){let n=++Je;$=!0,R=performance.now(),e.world.update([D.position.x,0,D.position.z],{budgetMs:t,maxCooksPerUpdate:Ae,signal:e.abort.signal,...e.tap===void 0?{}:{gpu:e.tap}}).then(t=>{if(e.disposed)return;qe=t.pending,L=t.elapsedMs;let n=e.tap?.drain();n!==void 0&&(P=n),gt(),z&&(z=!1,Z(ht()))}).catch(t=>{t instanceof ne||(console.error(t),e.disposed||Z(`Update failed: ${Me(t)}`))}).finally(()=>{n===Je&&($=!1)})}var V=0,Xe=0,H=new Set;window.addEventListener(`keydown`,e=>{let t=e.key.toLowerCase();if(t===`g`){tt(x===`gpu`?`cpu`:`gpu`);return}H.add(t)}),window.addEventListener(`keyup`,e=>H.delete(e.key.toLowerCase())),document.addEventListener(`visibilitychange`,()=>{document.visibilityState===`visible`&&(R=performance.now())});var U=me({title:`Infinite world`,info:`Unbounded landmark level + world-anchored rock cells streamed around a flying camera. Steer with A/D or arrow keys.`}),Ze=document.createElement(`style`);Ze.textContent=`
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
`,document.head.appendChild(Ze);var Qe=U.el.querySelector(`.pcg-stats`)?.previousElementSibling??U.el;U.addSeed(Ee,e=>{Ee=e,B()}),U.addSlider(`Speed`,{min:0,max:80,step:1,value:y,format:e=>`${e} u/s`},e=>{y=e}),U.addSlider(`Gen radius`,{min:60,max:240,step:10,value:b,format:e=>`${e} u`},e=>{b=e,B()}),U.addSlider(`Cell size`,{min:20,max:80,step:20,value:C,format:e=>`${e} u`},e=>{C=e,Fe(),B()}),U.addCheckbox(`World-anchored`,w,e=>{w=e,mt(),B()}),U.addCheckbox(`Halo (4 u)`,De,e=>{De=e,B()}),U.addCheckbox(`Cell grid`,T,e=>{T=e,k&&(k.visible=e),Ie()});var W=document.createElement(`div`);W.className=`pcg04-seg`;var G=document.createElement(`button`);G.type=`button`,G.textContent=`GPU per-node`;var K=document.createElement(`button`);K.type=`button`,K.textContent=`CPU`,W.append(G,K);var q=document.createElement(`p`);q.className=`pcg04-hint`,q.textContent=`G switches path · A/D or ←/→ steer`;var $e=document.createElement(`div`);$e.className=`pcg-row`;var et=document.createElement(`label`);et.textContent=`Derived specs`;var J=document.createElement(`input`);J.type=`checkbox`,J.checked=S,J.addEventListener(`change`,()=>{S=J.checked,B()}),$e.append(et,J),Qe.prepend(W,q,$e);function tt(e){if(e!==x){if(e===`gpu`&&!F()){Z(N?Q():M??`GPU path not ready yet.`);return}x=e,Y(),B(),Z(ht())}}G.addEventListener(`click`,()=>tt(`gpu`)),K.addEventListener(`click`,()=>tt(`cpu`));function Y(){G.setAttribute(`aria-pressed`,String(x===`gpu`)),K.setAttribute(`aria-pressed`,String(x===`cpu`)),G.disabled=!F(),G.title=M===void 0?N?Q():``:M,J.disabled=!F()||x===`cpu`}var X=U.addStat(`Adapter`),nt=U.addStat(`FPS`),rt=U.addStat(`Rock source`),it=U.addStat(`Rock cells`),at=U.addStat(`Cooked / evicted`),ot=U.addStat(`Pending`),st=U.addStat(`Instances`),ct=U.addStat(`Position`),lt=U.addStat(`Cook`),ut=U.addStat(`Resident runs / fused members`),dt=U.addStat(`Device dispatches`),ft=U.addStat(`GPU fallbacks`),pt=U.addStat(`Status`);function Z(e){pt(e)}function mt(){rt(w?`pointScatterInWorld`:`pointScatterInBounds`)}function Q(){return`Device lost (${Ve}) — the GPU path is disabled; reload for a fresh device`}function ht(){return N?Q():x===`cpu`?`CPU path — no resolver passed to the cook`:F()?S?`GPU per-node — combinator fields accepted via acceptDerivedSpecs`:`GPU per-node — acceptDerivedSpecs off, so every field falls back`:M??`Requesting WebGPU adapter…`}function gt(){if(lt(L===void 0?`–`:`${L.toFixed(1)} ms`),P===void 0){ut(I?.tap===void 0?`– (no GPU resolver)`:`–`),dt(`–`),ft(`–`);return}ut(`${P.residentRuns} / ${P.fusedNodes}`),dt(String(P.dispatches)),ft(Te(P.fallbacks))}var _t=U.addSlot();oe(),U.addNote(`Drag “Cell size”: the blue grid re-cells the world and the rocks do not move or resize. Untick “Halo” to watch every border grow a band of undersized rocks, and “World-anchored” to watch the same drag re-roll the world from scratch.`);var vt=U.addCollapsible(`Anchoring · what the fine level actually does`);vt.textContent=`pointScatterInWorld scatters over an INFINITE lattice fixed to
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
update cooks nothing.`;function bt(e){N=!0,Ve=e,j=`Device lost`,X(j),Z(Q()),Y(),x===`gpu`&&(x=`cpu`,Y(),B())}async function xt(){let e=await Se(bt);if(`error`in e){M=e.error,j=`No WebGPU adapter`,X(j),x=`cpu`,Y(),Z(`${e.error} Running the CPU path.`);return}try{let t=Ce(e);A=t.derived,Be=t.strict}catch(e){M=`GpuFieldEvaluator construction failed: ${Me(e)}`,j=`Evaluator unavailable`,X(j),x=`cpu`,Y(),Z(`${M} Running the CPU path.`);return}N||(j=e.label,X(j),Y(),Z(ht()),x===`gpu`&&B())}var $=!1,St=v(e=>nt(e));X(j),Z(`Requesting WebGPU adapter…`),Y(),mt(),gt(),Fe(),B(),xt(),Ne(e=>{St(),Xe=(H.has(`a`)||H.has(`arrowleft`)?1:0)-(H.has(`d`)||H.has(`arrowright`)?1:0),V+=Xe*1.1*e,D.position.x+=Math.sin(V)*y*e,D.position.z+=Math.cos(V)*y*e,D.position.y=26,D.lookAt(D.position.x+Math.sin(V)*60,5,D.position.z+Math.cos(V)*60),Ie();let t=I;if(t&&!$?Ye(t,Oe):$&&!z&&performance.now()-R>je&&(z=!0,Z(`A cook has been in flight for over 5 s — the GPU device may have been lost.`)),t){let e=t.world.stats(),n=e.levels.find(e=>e.name===`rocks`)?.cellCount??0;it(String(n)),at(`${e.totalCooked} / ${e.totalEvicted}`),ot(String(qe));let r=0;for(let e of t.cellInstances.values())r+=e;st(String(r)),ct(`${D.position.x.toFixed(0)}, ${D.position.z.toFixed(0)}`)}});