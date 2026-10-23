import{$s as e,Bo as t,Cr as n,Mo as r,Qs as i,R as a,_a as o,bs as s,dt as c,fn as l,fs as u,gt as d,ht as f,mn as p,nc as m,qo as h,qs as g,r as _,rs as ee,tc as te,to as ne,wr as v,zo as y}from"./wordmark-DQwz3EdU.js";import{a as b}from"./three.module-D5rm95Ex.js";import{t as x}from"./fps-BGOI9Z95.js";import{t as re}from"./OrbitControls-CdbmGvLD.js";import{a as S,c as C,o as w,s as T}from"./three-Wx1bvnb7.js";import{t as E}from"./recook-DLZ34zXJ.js";import{n as D,t as O}from"./panel-CCN4tbqZ.js";var k={instances:`instances`},A=`lantern`,j=`seed`,M=`seedWidened`;function ie(n={}){let{seed:a=7,count:c=6e3,extent:l=90,relief:u=30}=n,d=new t(a),f=d.add(ne,{count:c,boundsMin:[-l,0,-l],boundsMax:[l,0,l]},`scatter`),p=s(g(h(ee,{seed:{from:`node`,variant:0},frequency:.011,octaves:4,gain:.5,normalized:!0}),.28,.72,0,u),g(m(`hover`),0,1,0,9)),_=d.add(r,{name:`P`,type:`f32`,tupleSize:3,value:s(te(),i(0,p,0))},`lift`),v=g(m(`size`),0,1,.55,1.5),y=d.add(r,{name:`scale`,type:`f32`,tupleSize:3,value:i(v,v,v)},`size`),b=d.add(r,{name:M,type:`f32`,tupleSize:1,value:e(j)},`widen`),x=d.add(o,{assetId:A,instanceAttrs:[j,M]},`spawn`);return d.connect(f,`out`,_,`in`),d.connect(_,`out`,y,`in`),d.connect(y,`out`,b,`in`),d.connect(b,`out`,x,`in`),d.output(x,`instances`,k.instances),d}function ae(e){for(let t of e??[])if(t.kind===`instances`){if(u(t))throw Error(`lanterns: the graph produced device-resident batches, whose columns are GPU buffers`);return t.batches}throw Error(`lanterns: the graph produced no instance batches`)}function oe(e){let t=0,n=0,r=new Set,i=new Set;for(let a of e){let e=a.attributes?.[j],o=a.attributes?.[M];if(!(!e||!o))for(let s=0;s<a.count;s++){let a=e[s],c=o[s];a!==c&&t++,n=Math.max(n,Math.abs(c-a)),r.add(a&255),i.add(c>>>0&255)}}return{altered:t,worst:n,huesExact:r.size,huesWidened:i.size}}async function se(e,t,n){let r=performance.now(),i=ie({seed:e,count:t,relief:n}),a=(await y(i)).outputs,o=ae(a[k.instances]);return{graph:i,batches:o,count:o.reduce((e,t)=>e+t.count,0),cookMs:performance.now()-r,loss:oe(o)}}var N=329483,P=90,F=420,I=6.2831853;function L(){return new v({glslVersion:f,uniforms:{uTime:{value:0},uWiden:{value:0},uPulse:{value:1},uBob:{value:1.4},uBackground:{value:new a(N)},uFogNear:{value:P},uFogFar:{value:F}},vertexShader:`
      in uint ${j};    // the u32 channel: the point's identity hash
      in float ${M}; // the same id, after one f32 store

      uniform float uTime, uWiden, uPulse, uBob;

      out vec3 vTint;
      out float vShade;
      out float vGlow;
      out float vDepth;

      vec3 palette(float t) {
        return 0.5 + 0.5 * cos(${I} * (t + vec3(0.0, 0.33, 0.67)));
      }

      void main() {
        // The whole ABI, in one line. Everything below is this page's
        // opinion about an integer the graph settled.
        // The clamp is not decoration. A u32 in the top 128 values
        // rounds UP to exactly 2^32 as an f32, and float-to-uint is
        // undefined there — so the widened path needs a guard the exact
        // path does not, which is one more thing the dtype buys.
        // 4294967040 is the largest f32 below 2^32.
        uint id = uWiden > 0.5
          ? uint(min(${M}, 4294967040.0))
          : ${j};

        float hue = float(id & 0xFFu) / 255.0;
        float phase = float((id >> 8) & 0x3FFu) / 1023.0;
        float rate = 0.45 + float((id >> 18) & 0x7Fu) / 127.0 * 1.15;

        float t = uTime * uPulse;
        vec4 world = instanceMatrix * vec4(position, 1.0);
        world.y += sin(t * rate * 0.5 + phase * ${I}) * uBob;
        vec4 mv = modelViewMatrix * world;
        gl_Position = projectionMatrix * mv;

        vec3 n = normalize(mat3(modelViewMatrix) * mat3(instanceMatrix) * normal);
        vShade = 0.3 + 0.7 * max(n.z, 0.0);
        vGlow = 0.22 + 0.78 * (0.5 + 0.5 * sin(t * rate + phase * ${I}));
        vTint = palette(hue);
        vDepth = -mv.z;
      }`,fragmentShader:`
      uniform vec3 uBackground;
      uniform float uFogNear, uFogFar;

      in vec3 vTint;
      in float vShade;
      in float vGlow;
      in float vDepth;

      layout(location = 0) out vec4 fragColor;

      // A filmic curve, because the tone mapping three applies to its own
      // materials is a shader chunk this material never receives. Without
      // it every lantern past half brightness clips to the same flat
      // wall of colour — which flattens the hue spread that is the entire
      // readout, so this is legibility, not taste.
      vec3 filmic(vec3 x) {
        return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
      }

      void main() {
        vec3 lit = filmic(vTint * (vShade * 0.5 + vGlow * 1.45));
        fragColor = vec4(mix(lit, uBackground, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
      }`})}var R=new b({antialias:!0});R.setPixelRatio(Math.min(window.devicePixelRatio,2)),R.setSize(window.innerWidth,window.innerHeight),R.setClearColor(N,1),document.body.appendChild(R.domElement);var z=new n;z.fog=new c(N,P,F);var B=new p(50,window.innerWidth/window.innerHeight,.5,2e3);B.position.set(0,86,168);var V=new re(B,R.domElement);V.target.set(0,20,0),V.enableDamping=!0,V.autoRotate=!0,V.autoRotateSpeed=.28,V.update(),z.add(new d(220,22,1779766,1054752)),window.addEventListener(`resize`,()=>{B.aspect=window.innerWidth/window.innerHeight,B.updateProjectionMatrix(),R.setSize(window.innerWidth,window.innerHeight)});var H=new l(.66,0).scale(.78,1.5,.78),U=[];function W(){for(let e of U){if(z.remove(e),e.dispose(),T(e))for(let t of S(e.material))t.dispose();w(e)&&e.geometry.dispose()}U=[]}function G(e){W();let t=L(),n={[A]:{geometry:H,material:t}};try{U=C(e.batches,n,{requireChannels:[j,M]})}finally{t.dispose()}for(let e of U)z.add(e);Z()}var K=D({title:`Lanterns`,info:`Every lantern's colour, pulse and bob is derived in the vertex shader from ONE u32 the graph settled — the point's own seed, carried out as a named per-instance channel. The graph has no clock; the shader has no idea where anything is. Switch the ID source to the f32 copy of the same ID to see what widening an identity hash costs.`}),q={seed:7,count:6e3,relief:30,widened:!1,pulse:1,paused:!1},J,Y=E(async()=>{let e=await se(q.seed,q.count,q.relief);G(e),le(e.count.toLocaleString()),ue(`${e.cookMs.toFixed(0)} ms`),de(`${e.loss.altered.toLocaleString()} of ${e.count.toLocaleString()}`),fe(`±${e.loss.worst.toLocaleString()}`),X(`${e.loss.huesExact} exact → ${e.loss.huesWidened} widened`);let t=[{name:`Lantern field`,graph:e.graph}];J?J.set(t):J=O(t,{into:pe,title:`Graph`})});K.addSeed(q.seed,e=>{q.seed=e,Y()}),K.addSlider(`Lanterns`,{min:500,max:3e4,step:500,value:q.count},e=>{q.count=e,Y()}),K.addSlider(`Relief`,{min:0,max:60,step:1,value:q.relief},e=>{q.relief=e,Y()}),K.addSelect(`ID source`,[{value:`exact`,label:`seed — u32`},{value:`widened`,label:`seedWidened — f32`}],`exact`,e=>{q.widened=e===`widened`,Z()}),K.addSlider(`Pulse`,{min:0,max:3,step:.05,value:q.pulse},e=>{q.pulse=e,Z()}),K.addCheckbox(`Pause`,q.paused,e=>{q.paused=e});var ce=K.addStat(`FPS`),le=K.addStat(`Lanterns`),ue=K.addStat(`Cook`),de=K.addStat(`IDs altered by f32`),fe=K.addStat(`Worst drift`),X=K.addStat(`Distinct hues`),pe=K.addSlot();_();function Z(){for(let e of U)for(let t of Array.isArray(e.material)?e.material:[e.material]){let e=t.uniforms;e.uWiden.value=+!!q.widened,e.uPulse.value=q.pulse}}var me=x(ce),Q=0,$=performance.now();R.setAnimationLoop(()=>{let e=performance.now(),t=Math.min((e-$)/1e3,.1);$=e,q.paused||(Q+=t);for(let e of U)for(let t of Array.isArray(e.material)?e.material:[e.material])t.uniforms.uTime.value=Q;V.update(),R.render(z,B),me()}),Y();