import{Ai as e,Dr as t,Fr as n,Ft as r,Kn as i,Ln as a,Lt as o,Nn as ee,Or as te,Rn as ne,_r as re,ai as s,di as ie,ei as ae,er as oe,mi as se,r as c,sr as ce,ui as le,vn as ue,yn as de}from"./wordmark-BTK0QBCt.js";import{t as fe}from"./types-C9vZymIy.js";import{A as l,Ct as u,Mt as d,U as f,Ut as p,W as pe,q as m}from"./three.core-cG3dKMUi.js";import{t as h}from"./fps-BGOI9Z95.js";import{t as g}from"./scene-_7Plscro.js";import{t as me}from"./gpu-zWPMTSI1.js";import{r as he}from"./three-DAiObJG9.js";import{n as ge,t as _e}from"./panel-DuMYt3wD.js";var ve=.35,ye=777;function be(){let t=new oe,n=t.add(ue,{count:170,boundsMin:[-800,0,-800],boundsMax:[800,0,800]}),r=t.add(i,{name:`scale`,tupleSize:3,value:(()=>{let e=s(se(`mega`),0,1,5,13);return le(e,ae(e,1.6),e)})()}),a=t.add(o,{assetId:`megarock`});return t.connect(n,`out`,r,`in`),t.connect(r,`out`,a,`in`),t.output(a,`instances`,`instances`),{name:`landmarks`,cellSize:`unbounded`,generationRadius:1/0,graph:t,bind(t,i){t.setParam(n,`seed`,i.seed),t.setParam(r,`seed`,e(i.seed,9))}}}function xe(t){let{cellSize:r,generationRadius:te,anchored:c}=t,l=t.halo?4:0,u=new oe,d=c?u.add(de,{density:ve,cellSize:7,latticeMode:`xz`,height:0}):u.add(ue,{count:Math.round(ve*(r+2*l)**2)}),f=u.add(i,{name:`density`,tupleSize:1,value:s(ce(re,{seed:ye,frequency:.02,octaves:3}),-1,1,0,1)}),p=u.add(ne,{mode:`probabilistic`}),pe=u.add(ee,{radius:4,countAttr:`nbrCount`}),m=u.add(a,{mode:`inside`}),h=u.add(i,{name:`scale`,tupleSize:3,value:(()=>{let e=s(n(ie(`nbrCount`),2,16),2,16,.4,1.35),t=ae(e,s(se(`rock`),0,1,.85,1.15));return le(t,t,t)})()}),g=u.add(o,{assetId:`rock`});return u.connect(d,`out`,f,`in`),u.connect(f,`out`,p,`in`),u.connect(p,`out`,pe,`in`),u.connect(pe,`out`,m,`in`),u.connect(m,`out`,h,`in`),u.connect(h,`out`,g,`in`),u.output(g,`instances`,`instances`),{name:`rocks`,cellSize:r,generationRadius:te,graph:u,bind(t,n){let{min:r,max:i}=fe(n);t.setParam(d,`boundsMin`,[r[0]-l,0,r[1]-l]),t.setParam(d,`boundsMax`,[i[0]+l,0,i[1]+l]);let a=c?n.worldSeed:n.seed;t.setParam(d,`seed`,a),t.setParam(p,`seed`,e(a,1)),t.setParam(h,`seed`,e(a,2)),t.setParam(m,`boundsMin`,[r[0],-1,r[1]]),t.setParam(m,`boundsMax`,[i[0],1,i[1]])}}}function Se(e){return e instanceof Error?e.message:String(e)}function Ce(e){let t=(e?.description??``)===``?e?.device:e?.description;return[e?.vendor,e?.architecture,t].filter(e=>typeof e==`string`&&e!==``).join(` · `)||`adapter (no info exposed)`}async function we(e){let t=navigator.gpu;if(t===void 0)return{error:`navigator.gpu is missing — this browser has no WebGPU.`};try{let n=await t.requestAdapter();if(n===null)return{error:`navigator.gpu.requestAdapter() returned null — no compatible GPU adapter.`};let r=n.info,i=await n.requestDevice(),a=i.lost;return a!==void 0&&a.then(t=>{e(`${t?.reason??`unknown`}: ${t?.message??`no detail`}`)}),{device:i,info:r,label:Ce(r)}}catch(e){return{error:`requestDevice() failed: ${Se(e)}`}}}function Te(e){let t=e.info===void 0?{}:{adapterInfo:e.info};return{derived:new me(e.device,{...t,acceptDerivedSpecs:!0}),strict:new me(e.device,t)}}var Ee=class{cacheSalt;residentTerminals;acceptDerivedSpecs;base;seen=new Set;constructor(e){this.base=e,this.cacheSalt=e.cacheSalt,this.residentTerminals=e.residentTerminals,this.acceptDerivedSpecs=e.acceptDerivedSpecs}resolveField(e,t,n){return n!==void 0&&this.seen.add(n),this.base.resolveField(e,t,n)}planRun(e,t,n){return n!==void 0&&this.seen.add(n),this.base.planRun(e,t,n)}executeRun(e,t,n){return n!==void 0&&this.seen.add(n),this.base.executeRun(e,t,n)}drain(){if(this.seen.size===0)return;let e=te();for(let t of this.seen){e.dispatches+=t.dispatches,e.pipelinesCompiled+=t.pipelinesCompiled,e.pipelineCacheHits+=t.pipelineCacheHits,e.residentRuns+=t.residentRuns,e.fusedNodes+=t.fusedNodes,e.readbacksSaved+=t.readbacksSaved;for(let[n,r]of Object.entries(t.fallbacks))e.fallbacks[n]=(e.fallbacks[n]??0)+r}return this.seen.clear(),e}};function De(e){let t=Object.entries(e).sort(([e],[t])=>e.localeCompare(t));return t.length===0?`none`:t.map(([e,t])=>`${e} ×${t}`).join(`, `)}var Oe=1,_=18,v=140,y=`gpu`,b=!0,x=20,S=!0,ke=!0,C=!0,Ae=7,je=12,Me=8,Ne=5e3;function Pe(e){return e instanceof Error?e.message:String(e)}var{scene:w,camera:T,start:Fe}=g({cameraPosition:[0,26,0],orbit:!1,fog:{near:140,far:640},far:1600}),E=new u(new p(4e3,4e3),new d({color:1449515,roughness:1}));E.rotation.x=-Math.PI/2,E.position.y=-.03,w.add(E);var Ie=40,D;function Le(){D&&(w.remove(D),D.geometry.dispose(),D.material.dispose());let e=new f(x*Ie,Ie,4158656,2903936),t=e.material;t.transparent=!0,t.opacity=.45,t.depthWrite=!1,e.position.y=.02,e.visible=C,w.add(e),D=e}function Re(){!D||!D.visible||(D.position.x=Math.round(T.position.x/x)*x,D.position.z=Math.round(T.position.z/x)*x)}var ze=new d({color:8028816,roughness:.95,flatShading:!0}),Be=new d({color:6121077,roughness:1,flatShading:!0}),Ve={megarock:{geometry:new l(1).translate(0,.62,0),material:Be},rock:{geometry:new m(.55).translate(0,.33,0),material:ze}},He,Ue,O=`requesting…`,k,A=!1,We=``,j;function M(){return He!==void 0&&!A}function Ge(){if(!(y===`cpu`||!M()))return b?He:Ue}var N;function Ke(e,t){let n=[{name:`landmarks`,graph:e},{name:`rocks`,graph:t}];N?N.set(n):N=_e(n,{into:_t,title:`infinite world`})}function qe(e,t){let n=e*1.25/t+1.5;return Math.max(256,Math.ceil(Math.PI*n*n))}function Je(e){let t=0;for(let n of Object.keys(e))for(let r of e[n])if(r.kind===`instances`)for(let e of r.batches)t+=e.count;return t}var P,F=0,I,Ye=0,L=!1,Xe=0;function R(){P&&(P.disposed=!0,P.abort.abort(),P.binding.dispose(),w.remove(P.group));let e=new pe;w.add(e);let t=new he({group:e,assets:Ve}),n=new Map,i=Ge(),a={world:void 0,group:e,binding:t,cellInstances:n,tap:i===void 0?void 0:new Ee(i),abort:new AbortController,disposed:!1},o=[be(),xe({cellSize:x,generationRadius:v,anchored:S,halo:ke})];Ke(o[0].graph,o[1].graph),a.world=new r({seed:Oe,levels:o,maxCellsPerLevel:qe(v,x),...a.tap===void 0?{}:{gpu:a.tap},onCellReady:(e,r,i)=>{a.disposed||(t.cellReady(e,r,i),n.set(`${e}|${r[0]},${r[1]}`,Je(i)))},onCellEvicted:(e,r)=>{a.disposed||(t.cellEvicted(e,r),n.delete(`${e}|${r[0]},${r[1]}`))}}),P=a,F=0,j=void 0,I=void 0,gt(),Ze(a,je)}function Ze(e,n){let r=++Xe;$=!0,Ye=performance.now(),e.world.update([T.position.x,0,T.position.z],{budgetMs:n,maxCooksPerUpdate:Me,signal:e.abort.signal,...e.tap===void 0?{}:{gpu:e.tap}}).then(t=>{if(e.disposed)return;F=t.pending,I=t.elapsedMs;let n=e.tap?.drain();n!==void 0&&(j=n),gt(),L&&(L=!1,Z(ht()))}).catch(n=>{n instanceof t||(console.error(n),e.disposed||Z(`update failed: ${Pe(n)}`))}).finally(()=>{r===Xe&&($=!1)})}var z=0,Qe=0,B=new Set;window.addEventListener(`keydown`,e=>{let t=e.key.toLowerCase();if(t===`g`){J(y===`gpu`?`cpu`:`gpu`);return}B.add(t)}),window.addEventListener(`keyup`,e=>B.delete(e.key.toLowerCase())),document.addEventListener(`visibilitychange`,()=>{document.visibilityState===`visible`&&(Ye=performance.now())});var V=ge({title:`infinite world`,info:`Unbounded landmark level + world-anchored rock cells streamed around a flying camera. Steer with A/D or arrow keys.`}),$e=document.createElement(`style`);$e.textContent=`
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
`,document.head.appendChild($e);var et=V.el.querySelector(`.pcg-stats`)?.previousElementSibling??V.el;V.addSeed(Oe,e=>{Oe=e,R()}),V.addSlider(`speed`,{min:0,max:80,step:1,value:_,format:e=>`${e} u/s`},e=>{_=e}),V.addSlider(`gen radius`,{min:60,max:240,step:10,value:v,format:e=>`${e} u`},e=>{v=e,R()}),V.addSlider(`cell size`,{min:20,max:80,step:20,value:x,format:e=>`${e} u`},e=>{x=e,Le(),R()}),V.addCheckbox(`world-anchored`,S,e=>{S=e,mt(),R()}),V.addCheckbox(`halo (4 u)`,ke,e=>{ke=e,R()}),V.addCheckbox(`cell grid`,C,e=>{C=e,D&&(D.visible=e),Re()});var H=document.createElement(`div`);H.className=`pcg04-seg`;var U=document.createElement(`button`);U.type=`button`,U.textContent=`GPU per-node`;var W=document.createElement(`button`);W.type=`button`,W.textContent=`CPU`,H.append(U,W);var G=document.createElement(`p`);G.className=`pcg04-hint`,G.textContent=`G switches path · A/D or ←/→ steer`;var K=document.createElement(`div`);K.className=`pcg-row`;var tt=document.createElement(`label`);tt.textContent=`derived specs`;var q=document.createElement(`input`);q.type=`checkbox`,q.checked=b,q.addEventListener(`change`,()=>{b=q.checked,R()}),K.append(tt,q),et.prepend(H,G,K);function J(e){if(e!==y){if(e===`gpu`&&!M()){Z(A?Q():k??`GPU path not ready yet.`);return}y=e,Y(),R(),Z(ht())}}U.addEventListener(`click`,()=>J(`gpu`)),W.addEventListener(`click`,()=>J(`cpu`));function Y(){U.setAttribute(`aria-pressed`,String(y===`gpu`)),W.setAttribute(`aria-pressed`,String(y===`cpu`)),U.disabled=!M(),U.title=k===void 0?A?Q():``:k,q.disabled=!M()||y===`cpu`}var X=V.addStat(`adapter`),nt=V.addStat(`fps`),rt=V.addStat(`rock source`),it=V.addStat(`rock cells`),at=V.addStat(`cooked / evicted`),ot=V.addStat(`pending`),st=V.addStat(`instances`),ct=V.addStat(`position`),lt=V.addStat(`cook`),ut=V.addStat(`resident runs / fused members`),dt=V.addStat(`device dispatches`),ft=V.addStat(`gpu fallbacks`),pt=V.addStat(`status`);function Z(e){pt(e)}function mt(){rt(S?`pointScatterInWorld`:`pointScatterInBounds`)}function Q(){return`device lost (${We}) — the GPU path is disabled; reload for a fresh device`}function ht(){return A?Q():y===`cpu`?`CPU path — no resolver passed to the cook`:M()?b?`GPU per-node — combinator fields accepted via acceptDerivedSpecs`:`GPU per-node — acceptDerivedSpecs off, so every field falls back`:k??`requesting WebGPU adapter…`}function gt(){if(lt(I===void 0?`–`:`${I.toFixed(1)} ms`),j===void 0){ut(P?.tap===void 0?`– (no GPU resolver)`:`–`),dt(`–`),ft(`–`);return}ut(`${j.residentRuns} / ${j.fusedNodes}`),dt(String(j.dispatches)),ft(De(j.fallbacks))}var _t=V.addSlot();c(),V.addNote(`Drag “cell size”: the blue grid re-cells the world and the rocks do not move or resize. Untick “halo” to watch every border grow a band of undersized rocks, and “world-anchored” to watch the same drag re-roll the world from scratch.`);var vt=V.addCollapsible(`anchoring · what the fine level actually does`);vt.textContent=`pointScatterInWorld scatters over an INFINITE lattice fixed to
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
update cooks nothing.`;function bt(e){A=!0,We=e,O=`device lost`,X(O),Z(Q()),Y(),y===`gpu`&&(y=`cpu`,Y(),R())}async function xt(){let e=await we(bt);if(`error`in e){k=e.error,O=`no WebGPU adapter`,X(O),y=`cpu`,Y(),Z(`${e.error} Running the CPU path.`);return}try{let t=Te(e);He=t.derived,Ue=t.strict}catch(e){k=`GpuFieldEvaluator construction failed: ${Pe(e)}`,O=`evaluator unavailable`,X(O),y=`cpu`,Y(),Z(`${k} Running the CPU path.`);return}A||(O=e.label,X(O),Y(),Z(ht()),y===`gpu`&&R())}var $=!1,St=h(e=>nt(e));X(O),Z(`requesting WebGPU adapter…`),Y(),mt(),gt(),Le(),R(),xt(),Fe(e=>{St(),Qe=(B.has(`a`)||B.has(`arrowleft`)?1:0)-(B.has(`d`)||B.has(`arrowright`)?1:0),z+=Qe*1.1*e,T.position.x+=Math.sin(z)*_*e,T.position.z+=Math.cos(z)*_*e,T.position.y=26,T.lookAt(T.position.x+Math.sin(z)*60,5,T.position.z+Math.cos(z)*60),Re();let t=P;if(t&&!$?Ze(t,Ae):$&&!L&&performance.now()-Ye>Ne&&(L=!0,Z(`a cook has been in flight for over 5 s — the GPU device may have been lost.`)),t){let e=t.world.stats(),n=e.levels.find(e=>e.name===`rocks`)?.cellCount??0;it(String(n)),at(`${e.totalCooked} / ${e.totalEvicted}`),ot(String(F));let r=0;for(let e of t.cellInstances.values())r+=e;st(String(r)),ct(`${T.position.x.toFixed(0)}, ${T.position.z.toFixed(0)}`)}});