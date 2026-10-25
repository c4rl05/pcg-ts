import{$o as e,Cc as t,Dc as n,Ec as r,Ko as i,Qo as a,Sc as o,Ss as s,_c as c,as as l,ba as u,bc as d,bs as f,cc as p,cs as m,dc as h,ds as g,es as _,fc as v,gc as y,hc as b,ls as x,mc as S,ns as C,os as w,ps as ee,rs as T,sc as E,ts as D,uc as O,us as te,vc as k,vs as A,wc as j,xc as ne,yc as re}from"./wordmark-CcAThjJ2.js";var M=class extends Error{constructor(e){super(e),this.name=`GpuCompileError`}};function N(e,t){let n=Math.fround(e);if(!Number.isFinite(n))throw new M(`${t}: value ${e} is not representable as a finite f32 (WGSL kernels compute in f32; keep magnitudes within ~3.4e38)`);return Object.is(n,-0)?`-0f`:`${String(n)}f`}function ie(e){return`${e>>>0}u`}function P(e){return`0x${(e>>>0).toString(16).padStart(8,`0`)}u`}var F=P,ae=N(34028234663852886e22,`internal f32 max`);function oe(e,t){let n=F(e);for(let e of t)n=`pcg_hash_mix(${n}, ${e})`;return`pcg_hash_finalize(${n})`}function se(){let e=[];for(let t=0;t<12;t++){let n=e=>N(m[t*3+e],`internal GRAD3`);e.push(`  vec3<f32>(${n(0)}, ${n(1)}, ${n(2)}),`)}return`var<private> PCG_GRAD3: array<vec3<f32>, 12> = array<vec3<f32>, 12>(
${e.join(`
`)}
);`}var I=e=>t=>N(t,e),ce=new Map([[`PCG_GRAD3`,{deps:[],text:se()}],[`pcg_hash_mix`,{deps:[],text:`fn pcg_hash_mix(h_in: u32, value: u32) -> u32 {
  var k = value * ${F(re)};
  k = (k << 15u) | (k >> 17u);
  k = k * ${F(d)};
  var h = h_in ^ k;
  h = (h << 13u) | (h >> 19u);
  h = h * 5u + ${F(ne)};
  return h;
}`}],[`pcg_hash_finalize`,{deps:[],text:`fn pcg_hash_finalize(h_in: u32) -> u32 {
  var h = h_in ^ (h_in >> 16u);
  h = h * ${F(y)};
  h = h ^ (h >> 13u);
  h = h * ${F(c)};
  h = h ^ (h >> 16u);
  return h;
}`}],[`pcg_hash3`,{deps:[`pcg_hash_mix`,`pcg_hash_finalize`],text:`fn pcg_hash3(a: u32, b: u32, c: u32) -> u32 {
  return ${oe(t(3),[`a`,`b`,`c`])};
}`}],[`pcg_hash4`,{deps:[`pcg_hash_mix`,`pcg_hash_finalize`],text:`fn pcg_hash4(a: u32, b: u32, c: u32, d: u32) -> u32 {
  return ${oe(t(4),[`a`,`b`,`c`,`d`])};
}`}],[`pcg_hash5`,{deps:[`pcg_hash_mix`,`pcg_hash_finalize`],text:`fn pcg_hash5(a: u32, b: u32, c: u32, d: u32, e: u32) -> u32 {
  return ${oe(t(5),[`a`,`b`,`c`,`d`,`e`])};
}`}],[`pcg_hash_float`,{deps:[],text:`fn pcg_hash_float(h: u32) -> f32 {
  return f32(h >> 8u) * ${N(k,`internal hashFloat scale`)};
}`}],[`pcg_fade`,{deps:[],text:`fn pcg_fade(t: f32) -> f32 {
  return t * t * t * (t * (t * 6f - 15f) + 10f);
}`}],[`pcg_mix`,{deps:[],text:`fn pcg_mix(a: f32, b: f32, t: f32) -> f32 {
  return a + (b - a) * t;
}`}],[`pcg_value_noise`,{deps:[`pcg_hash4`,`pcg_hash_float`,`pcg_fade`,`pcg_mix`],text:`fn pcg_value_noise(seed: u32, p: vec3<f32>) -> f32 {
  let pf = floor(p);
  let x0 = bitcast<u32>(i32(pf.x));
  let y0 = bitcast<u32>(i32(pf.y));
  let z0 = bitcast<u32>(i32(pf.z));
  let fr = p - pf;
  let u = pcg_fade(fr.x);
  let v = pcg_fade(fr.y);
  let w = pcg_fade(fr.z);
  let v000 = pcg_hash_float(pcg_hash4(seed, x0, y0, z0));
  let v100 = pcg_hash_float(pcg_hash4(seed, x0 + 1u, y0, z0));
  let v010 = pcg_hash_float(pcg_hash4(seed, x0, y0 + 1u, z0));
  let v110 = pcg_hash_float(pcg_hash4(seed, x0 + 1u, y0 + 1u, z0));
  let v001 = pcg_hash_float(pcg_hash4(seed, x0, y0, z0 + 1u));
  let v101 = pcg_hash_float(pcg_hash4(seed, x0 + 1u, y0, z0 + 1u));
  let v011 = pcg_hash_float(pcg_hash4(seed, x0, y0 + 1u, z0 + 1u));
  let v111 = pcg_hash_float(pcg_hash4(seed, x0 + 1u, y0 + 1u, z0 + 1u));
  return pcg_mix(
    pcg_mix(pcg_mix(v000, v100, u), pcg_mix(v010, v110, u), v),
    pcg_mix(pcg_mix(v001, v101, u), pcg_mix(v011, v111, u), v),
    w);
}`}],[`pcg_perlin_gdot`,{deps:[`pcg_hash4`,`PCG_GRAD3`],text:`fn pcg_perlin_gdot(seed: u32, xi: u32, yi: u32, zi: u32, d: vec3<f32>) -> f32 {
  let g = pcg_hash4(seed, xi, yi, zi) % 12u;
  return dot(PCG_GRAD3[g], d);
}`}],[`pcg_perlin_noise`,{deps:[`pcg_perlin_gdot`,`pcg_fade`,`pcg_mix`],text:`fn pcg_perlin_noise(seed: u32, p: vec3<f32>) -> f32 {
  let pf = floor(p);
  let x0 = bitcast<u32>(i32(pf.x));
  let y0 = bitcast<u32>(i32(pf.y));
  let z0 = bitcast<u32>(i32(pf.z));
  let fr = p - pf;
  let u = pcg_fade(fr.x);
  let v = pcg_fade(fr.y);
  let w = pcg_fade(fr.z);
  let n000 = pcg_perlin_gdot(seed, x0, y0, z0, fr);
  let n100 = pcg_perlin_gdot(seed, x0 + 1u, y0, z0, fr - vec3<f32>(1f, 0f, 0f));
  let n010 = pcg_perlin_gdot(seed, x0, y0 + 1u, z0, fr - vec3<f32>(0f, 1f, 0f));
  let n110 = pcg_perlin_gdot(seed, x0 + 1u, y0 + 1u, z0, fr - vec3<f32>(1f, 1f, 0f));
  let n001 = pcg_perlin_gdot(seed, x0, y0, z0 + 1u, fr - vec3<f32>(0f, 0f, 1f));
  let n101 = pcg_perlin_gdot(seed, x0 + 1u, y0, z0 + 1u, fr - vec3<f32>(1f, 0f, 1f));
  let n011 = pcg_perlin_gdot(seed, x0, y0 + 1u, z0 + 1u, fr - vec3<f32>(0f, 1f, 1f));
  let n111 = pcg_perlin_gdot(seed, x0 + 1u, y0 + 1u, z0 + 1u, fr - vec3<f32>(1f, 1f, 1f));
  return ${I(`internal PERLIN_SCALE`)(w)} * pcg_mix(
    pcg_mix(pcg_mix(n000, n100, u), pcg_mix(n010, n110, u), v),
    pcg_mix(pcg_mix(n001, n101, u), pcg_mix(n011, n111, u), v),
    w);
}`}],[`pcg_simplex_corner`,{deps:[`pcg_hash4`,`PCG_GRAD3`],text:`fn pcg_simplex_corner(seed: u32, i: i32, j: i32, k: i32, x: f32, y: f32, z: f32) -> f32 {
  let t = ${I(`internal simplex R2`)(C)} - x * x - y * y - z * z;
  if (t <= 0f) {
    return 0f;
  }
  let g = pcg_hash4(seed, bitcast<u32>(i), bitcast<u32>(j), bitcast<u32>(k)) % 12u;
  let t2 = t * t;
  return t2 * t2 * dot(PCG_GRAD3[g], vec3<f32>(x, y, z));
}`}],[`pcg_simplex_noise`,{deps:[`pcg_simplex_corner`],text:`fn pcg_simplex_noise(seed: u32, p: vec3<f32>) -> f32 {
  let s = (p.x + p.y + p.z) * ${I(`internal simplex F3`)(_)};
  let i = i32(floor(p.x + s));
  let j = i32(floor(p.y + s));
  let k = i32(floor(p.z + s));
  let t = f32(i + j + k) * ${I(`internal simplex G3`)(D)};
  let x0 = p.x - (f32(i) - t);
  let y0 = p.y - (f32(j) - t);
  let z0 = p.z - (f32(k) - t);
  var i1: i32;
  var j1: i32;
  var k1: i32;
  var i2: i32;
  var j2: i32;
  var k2: i32;
  if (x0 >= y0) {
    if (y0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
    } else if (x0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1;
    } else {
      i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1;
    }
  } else {
    if (y0 < z0) {
      i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1;
    } else if (x0 < z0) {
      i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1;
    } else {
      i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
    }
  }
  let x1 = x0 - f32(i1) + ${I(`internal simplex G3`)(D)};
  let y1 = y0 - f32(j1) + ${I(`internal simplex G3`)(D)};
  let z1 = z0 - f32(k1) + ${I(`internal simplex G3`)(D)};
  let x2 = x0 - f32(i2) + ${I(`internal simplex 2*G3`)(2*D)};
  let y2 = y0 - f32(j2) + ${I(`internal simplex 2*G3`)(2*D)};
  let z2 = z0 - f32(k2) + ${I(`internal simplex 2*G3`)(2*D)};
  let x3 = x0 - 1f + ${I(`internal simplex 3*G3`)(3*D)};
  let y3 = y0 - 1f + ${I(`internal simplex 3*G3`)(3*D)};
  let z3 = z0 - 1f + ${I(`internal simplex 3*G3`)(3*D)};
  return ${I(`internal SIMPLEX_SCALE`)(72)} * (pcg_simplex_corner(seed, i, j, k, x0, y0, z0)
    + pcg_simplex_corner(seed, i + i1, j + j1, k + k1, x1, y1, z1)
    + pcg_simplex_corner(seed, i + i2, j + j2, k + k2, x2, y2, z2)
    + pcg_simplex_corner(seed, i + 1, j + 1, k + 1, x3, y3, z3));
}`}],[`pcg_worley_point_dist`,{deps:[`pcg_hash5`,`pcg_hash_float`],text:`fn pcg_worley_point_dist(seed: u32, gx: i32, gy: i32, gz: i32, p: vec3<f32>) -> f32 {
  let ux = bitcast<u32>(gx);
  let uy = bitcast<u32>(gy);
  let uz = bitcast<u32>(gz);
  let px = f32(gx) + pcg_hash_float(pcg_hash5(seed, ux, uy, uz, 0u));
  let py = f32(gy) + pcg_hash_float(pcg_hash5(seed, ux, uy, uz, 1u));
  let pz = f32(gz) + pcg_hash_float(pcg_hash5(seed, ux, uy, uz, 2u));
  let dx = px - p.x;
  let dy = py - p.y;
  let dz = pz - p.z;
  return sqrt(dx * dx + dy * dy + dz * dz);
}`}],[`pcg_worley`,{deps:[`pcg_worley_point_dist`],text:`fn pcg_worley(seed: u32, p: vec3<f32>, exact: bool, needs_f2: bool) -> vec2<f32> {
  let cx = i32(floor(p.x));
  let cy = i32(floor(p.y));
  let cz = i32(floor(p.z));
  var f1 = ${ae};
  var f2 = ${ae};
  for (var dz = -1; dz <= 1; dz++) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        let d = pcg_worley_point_dist(seed, cx + dx, cy + dy, cz + dz, p);
        if (d < f1) {
          f2 = f1;
          f1 = d;
        } else if (d < f2) {
          f2 = d;
        }
      }
    }
  }
  if (exact) {
    var r = 1;
    loop {
      var needed = f1;
      if (needs_f2) {
        needed = f2;
      }
      if (!(r < 3 && needed > f32(r))) {
        break;
      }
      r = r + 1;
      for (var dz = -r; dz <= r; dz++) {
        let az = abs(dz);
        for (var dy = -r; dy <= r; dy++) {
          let ay = abs(dy);
          for (var dx = -r; dx <= r; dx++) {
            let ax = abs(dx);
            if (ax != r && ay != r && az != r) {
              continue;
            }
            let d = pcg_worley_point_dist(seed, cx + dx, cy + dy, cz + dz, p);
            if (d < f1) {
              f2 = f1;
              f1 = d;
            } else if (d < f2) {
              f2 = d;
            }
          }
        }
      }
    }
  }
  return vec2<f32>(f1, f2);
}`}]]);function le(e){let t=new Set,n=e=>{if(t.has(e))return;let r=ce.get(e);if(!r)throw Error(`internal: unknown WGSL library item "${e}"`);t.add(e);for(let e of r.deps)n(e)};for(let t of e)n(t);let r=[];for(let[e,n]of ce)t.has(e)&&r.push(n.text);return r}var ue=`apply2`;function de(e,t=!1){return e>0?16+e*16:t?16:12}var fe=[`x`,`y`,`z`,`w`];function L(e,t,n){if(t.kind===`const`)return me(t,n);let r=he(e,t,n);return t.type===`f32`?r:`f32(${r})`}function pe(e,t,n){return t.kind===`const`?me(t,n):he(e,t,n)}function me(e,t){let n=e.tupleSize===1?0:t;if(n>=4)throw Error(`apply codegen: constant slot ${e.slot} has no component ${n} (a uniform slot holds 4 f32 components)`);return`params.consts[${e.slot}].${fe[n]}`}function he(e,t,n){return t.tupleSize===1?`${e}[i]`:n===0?`${e}[i * ${t.tupleSize}u]`:`${e}[i * ${t.tupleSize}u + ${n}u]`}function ge(e,t,n){return t===1?`${e}[i]`:n===0?`${e}[i * ${t}u]`:`${e}[i * ${t}u + ${n}u]`}var R=class{items=[];add(e,t,n,r){return this.items.push({role:e,access:t,elem:n,comment:r}),`b${this.items.length}`}};function _e(e){let t=0;for(let n of e)if(n.kind===`const`){if(n.slot<0||n.slot>=4)throw Error(`apply codegen: constant slot ${n.slot} is out of range; an apply kernel carries at most 4 uniform constant slots (raise MAX_APPLY_CONST_SLOTS in applyKernels.ts if a new node kind needs more)`);t=Math.max(t,n.slot+1)}return t}function z(e,t,n,r,i,a=!1){let o=[`@group(0) @binding(0) var<uniform> params: PcgParams;`],s=[];n.forEach((e,t)=>{let n=t+1,r=e.access===`read`?`read`:`read_write`;o.push(`@group(0) @binding(${n}) var<storage, ${r}> b${n}: array<${e.elem}>; // ${e.comment}`),s.push({binding:n,role:e.role,access:e.access})});let c=a?`
  base: u32,`:t===0?``:`
  _pad0: u32,`;return{wgsl:`// Generated by pcg-ts resident-run apply codegen.
// Dispatch: 1D, chunked; element index i = chunkOffset + gid.x, one
// invocation per element; only element i's slots are accessed.

struct PcgParams {
  count: u32,
  seed: u32,
  chunkOffset: u32,${t===0?c:`${c}\n  consts: array<vec4<f32>, ${t}>,`}
}

${o.join(`
`)}

${r.length>0?`${r.join(`

`)}\n\n`:``}@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x + params.chunkOffset;
  if (i >= params.count) {
    return;
  }
${i}
}
`,entryPoint:`main`,workgroupSize:64,bindings:s,constSlots:t,uniformBytes:de(t,a),key:`${ue}|${e}`}}var B=e=>e.kind===`column`?`${e.type}x${e.tupleSize}`:`constx${e.tupleSize}@${e.slot}`;function ve(e,t,n){let r=e.kind===`const`?`f32`:e.type,i=t===`f32`&&e.kind===`column`&&e.type===`f32`,a=i?`u32`:r,o=t===`bool`||i?`u32`:t,s=new R,c=e.kind===`column`?s.add(`value`,`read`,a,`value column ${B(e)}`):``,l=e.kind===`column`?{...e,type:a}:e,u=s.add(`target`,`read_write`,o,`target attribute ${t} tupleSize ${n}`),d=(e,n)=>{switch(t){case`f32`:return i?e:n;case`i32`:return r===`f32`?`i32(${e})`:r===`i32`?e:`bitcast<i32>(${e})`;case`u32`:return r===`f32`?`u32(${e})`:r===`u32`?e:`bitcast<u32>(${e})`;default:return`select(0u, 1u, ${e} != ${r===`f32`?`0f`:r===`i32`?`0i`:`0u`})`}},f=[];for(let e=0;e<n;e++){let t=pe(c,l,e);f.push(`  ${ge(u,n,e)} = ${d(t,L(c,l,e))};`)}return z(`setAttribute|val=${B(e)}|out=${t}x${n}`,_e([e]),s.items,[],f.join(`
`))}var ye={euler:`fn pcg_quat_from_euler_deg(r: vec3<f32>) -> vec4<f32> {
  let h = r * ${N(Math.PI/360,`internal PI/360`)};
  let sx = sin(h.x);
  let cx = cos(h.x);
  let sy = sin(h.y);
  let cy = cos(h.y);
  let sz = sin(h.z);
  let cz = cos(h.z);
  return vec4<f32>(
    sx * cy * cz - cx * sy * sz,
    cx * sy * cz + sx * cy * sz,
    cx * cy * sz - sx * sy * cz,
    cx * cy * cz + sx * sy * sz);
}`,mul:`fn pcg_quat_mul(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(
    a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z);
}`,rotate:`fn pcg_rotate_vec(q: vec4<f32>, v: vec3<f32>) -> vec3<f32> {
  let t = 2f * cross(q.xyz, v);
  return v + q.w * t + cross(q.xyz, t);
}`,basis:`fn pcg_quat_from_basis(bx: vec3<f32>, by: vec3<f32>, bz: vec3<f32>) -> vec4<f32> {
  let m11 = bx.x;
  let m12 = by.x;
  let m13 = bz.x;
  let m21 = bx.y;
  let m22 = by.y;
  let m23 = bz.y;
  let m31 = bx.z;
  let m32 = by.z;
  let m33 = bz.z;
  let trace = m11 + m22 + m33;
  if (trace > 0f) {
    let s = 0.5f / sqrt(trace + 1f);
    return vec4<f32>((m32 - m23) * s, (m13 - m31) * s, (m21 - m12) * s, 0.25f / s);
  } else if (m11 > m22 && m11 > m33) {
    let s = 2f * sqrt(1f + m11 - m22 - m33);
    return vec4<f32>(0.25f * s, (m12 + m21) / s, (m13 + m31) / s, (m32 - m23) / s);
  } else if (m22 > m33) {
    let s = 2f * sqrt(1f + m22 - m11 - m33);
    return vec4<f32>((m12 + m21) / s, 0.25f * s, (m23 + m32) / s, (m13 - m31) / s);
  }
  let s = 2f * sqrt(1f + m33 - m11 - m22);
  return vec4<f32>((m13 + m31) / s, (m23 + m32) / s, 0.25f * s, (m21 - m12) / s);
}`};function be(e,t,n,r,i){let a=new R,o=e.kind===`column`?a.add(`translate`,`read`,e.type,`translate column ${B(e)}`):``,s=t.kind===`column`?a.add(`rotateEuler`,`read`,t.type,`rotateEuler column ${B(t)}`):``,c=n.kind===`column`?a.add(`scale`,`read`,n.type,`scale column ${B(n)}`):``,l=a.add(`P`,`read_write`,`f32`,`attribute P: f32 tupleSize 3`),u=r?a.add(`rot`,`read_write`,`f32`,`attribute rot: f32 tupleSize 4`):``,d=i?a.add(`scaleAttr`,`read_write`,`f32`,`attribute scale: f32 tupleSize 3`):``,f=[];return f.push(`  let s = vec3<f32>(${[0,1,2].map(e=>L(c,n,e)).join(`, `)});`),f.push(`  let q = pcg_quat_from_euler_deg(vec3<f32>(${[0,1,2].map(e=>L(s,t,e)).join(`, `)}));`),f.push(`  let v = pcg_rotate_vec(q, vec3<f32>(${l}[i * 3u] * s.x, ${l}[i * 3u + 1u] * s.y, ${l}[i * 3u + 2u] * s.z));`),f.push(`  ${l}[i * 3u] = v.x + ${L(o,e,0)};`),f.push(`  ${l}[i * 3u + 1u] = v.y + ${L(o,e,1)};`),f.push(`  ${l}[i * 3u + 2u] = v.z + ${L(o,e,2)};`),r&&(f.push(`  let q2 = pcg_quat_mul(q, vec4<f32>(${u}[i * 4u], ${u}[i * 4u + 1u], ${u}[i * 4u + 2u], ${u}[i * 4u + 3u]));`),f.push(`  ${u}[i * 4u] = q2.x;`),f.push(`  ${u}[i * 4u + 1u] = q2.y;`),f.push(`  ${u}[i * 4u + 2u] = q2.z;`),f.push(`  ${u}[i * 4u + 3u] = q2.w;`)),i&&(f.push(`  ${d}[i * 3u] = ${d}[i * 3u] * s.x;`),f.push(`  ${d}[i * 3u + 1u] = ${d}[i * 3u + 1u] * s.y;`),f.push(`  ${d}[i * 3u + 2u] = ${d}[i * 3u + 2u] * s.z;`)),z(`transformPoints|t=${B(e)}|r=${B(t)}|s=${B(n)}|rot=${+!!r}|scl=${+!!i}`,_e([e,t,n]),a.items,[ye.euler,ye.mul,ye.rotate],f.join(`
`))}function xe(e,t){let n=new R,r=e.kind===`column`?n.add(`amount`,`read`,e.type,`amount column ${B(e)}`):``,i=t?n.add(`seed`,`read`,`u32`,`attribute seed: u32 tupleSize 1`):``,a=n.add(`P`,`read_write`,`f32`,`attribute P: f32 tupleSize 3`),o=[];o.push(`  let ident = pcg_hash4(bitcast<u32>(${a}[i * 3u]), bitcast<u32>(${a}[i * 3u + 1u]), bitcast<u32>(${a}[i * 3u + 2u]), ${t?`${i}[i]`:`0u`});`);for(let t=0;t<3;t++){let n=t===0?`i * 3u`:`i * 3u + ${t}u`;o.push(`  ${a}[${n}] = ${a}[${n}] + (pcg_hash_float(pcg_hash3(params.seed, ident, ${t}u)) * 2f - 1f) * ${L(r,e,t)};`)}return z(`jitterPoints|a=${B(e)}|s=${+!!t}`,_e([e]),n.items,le([`pcg_hash3`,`pcg_hash4`,`pcg_hash_float`]),o.join(`
`))}var Se={"+x":`f, u, -r`,"-x":`-f, u, r`,"+y":`-r, f, u`,"-y":`r, -f, u`,"+z":`r, u, f`,"-z":`-r, u, -f`};function Ce(e,t,n){let r=new R,i=e.kind===`column`?r.add(`direction`,`read`,e.type,`direction column ${B(e)}`):``,a=r.add(`rot`,`read_write`,`f32`,`attribute rot: f32 tupleSize 4`),o=N(1e-12,`internal ORIENT_PARALLEL_EPS`),s=`  let d = vec3<f32>(${[0,1,2].map(t=>L(i,e,t)).join(`, `)});
  let dl = dot(d, d);
  if (dl == 0f) {
    return; // zero direction: keep the prior rot
  }
  let f = d * (1f / sqrt(dl));
  let up = vec3<f32>(${[0,1,2].map(e=>L(``,n,e)).join(`, `)});
  // right = up x forward, falling back when (anti)parallel.
  var r = cross(up, f);
  var rl = dot(r, r);
  if (rl <= ${o}) {
    // [0, 0, 1] x f
    r = vec3<f32>(-f.y, f.x, 0f);
    rl = r.x * r.x + r.y * r.y;
    if (rl <= ${o}) {
      // f is (anti)parallel to Z too; [1, 0, 0] x f always works here.
      r = vec3<f32>(0f, -f.z, f.y);
      rl = r.y * r.y + r.z * r.z;
    }
  }
  r = r * (1f / sqrt(rl));
  // u = forward x right (unit: forward and right are orthonormal).
  let u = cross(f, r);
  let q = pcg_quat_from_basis(${Se[t]});
  ${a}[i * 4u] = q.x;
  ${a}[i * 4u + 1u] = q.y;
  ${a}[i * 4u + 2u] = q.z;
  ${a}[i * 4u + 3u] = q.w;`;return z(`orientAlongVector|d=${B(e)}|axis=${t}|up=${B(n)}`,_e([e,n]),r.items,[ye.basis],s)}function we(e,t,n=!1,r=0){let i=r>0;if(i&&r<3)throw Error(`apply codegen: spawnInstances colour source has tupleSize ${r}; components 0-2 are read as RGB, so it must be at least 3 (the planner rejects narrower columns before reaching codegen)`);let a=new R,o=a.add(`P`,`read`,`f32`,`attribute P: f32 tupleSize 3`),s=e?a.add(`rot`,`read`,`f32`,`attribute rot: f32 tupleSize 4`):``,c=t?a.add(`scaleAttr`,`read`,`f32`,`attribute scale: f32 tupleSize 3`):``,l=a.add(`transforms`,`read_write`,`f32`,`out: 16 f32 per instance`),u=n?a.add(`perm`,`read`,`u32`,`grouping permutation: source point index per slot`):``,d=i?a.add(`color`,`read`,`f32`,`colour source: f32 tupleSize ${r}`):``,f=i?a.add(`colors`,`read_write`,`f32`,`out: 4 f32 per instance (vec3 storage stride, [3] = 0 pad)`):``,p=n?`src`:`i`,m=e?`vec4<f32>(${s}[${p} * 4u], ${s}[${p} * 4u + 1u], ${s}[${p} * 4u + 2u], ${s}[${p} * 4u + 3u])`:`vec4<f32>(0f, 0f, 0f, 1f)`,h=t?`vec3<f32>(${c}[${p} * 3u], ${c}[${p} * 3u + 1u], ${c}[${p} * 3u + 2u])`:`vec3<f32>(1f, 1f, 1f)`,g=`${n?`  let src = ${u}[params.base + i];\n`:``}  let q = ${m};
  let s = ${h};
  let x2 = q.x + q.x;
  let y2 = q.y + q.y;
  let z2 = q.z + q.z;
  let xx = q.x * x2;
  let xy = q.x * y2;
  let xz = q.x * z2;
  let yy = q.y * y2;
  let yz = q.y * z2;
  let zz = q.z * z2;
  let wx = q.w * x2;
  let wy = q.w * y2;
  let wz = q.w * z2;
  let o = i * 16u;
  ${l}[o] = (1f - (yy + zz)) * s.x;
  ${l}[o + 1u] = (xy + wz) * s.x;
  ${l}[o + 2u] = (xz - wy) * s.x;
  ${l}[o + 3u] = 0f;
  ${l}[o + 4u] = (xy - wz) * s.y;
  ${l}[o + 5u] = (1f - (xx + zz)) * s.y;
  ${l}[o + 6u] = (yz + wx) * s.y;
  ${l}[o + 7u] = 0f;
  ${l}[o + 8u] = (xz + wy) * s.z;
  ${l}[o + 9u] = (yz - wx) * s.z;
  ${l}[o + 10u] = (1f - (xx + yy)) * s.z;
  ${l}[o + 11u] = 0f;
  ${l}[o + 12u] = ${o}[${p} * 3u];
  ${l}[o + 13u] = ${o}[${p} * 3u + 1u];
  ${l}[o + 14u] = ${o}[${p} * 3u + 2u];
  ${l}[o + 15u] = 1f;${i?`
  // Same ${p}: this instance's colour is this instance's point's colour.
  let cs = ${p} * ${r}u;
  let co = i * 4u;
  ${f}[co] = ${d}[cs];
  ${f}[co + 1u] = ${d}[cs + 1u];
  ${f}[co + 2u] = ${d}[cs + 2u];
  ${f}[co + 3u] = 0f;`:``}`;return z(`spawnInstances|rot=${+!!e}|scl=${+!!t}${n?`|perm`:``}${i?`|color=${r}`:``}`,0,a.items,[],g,n)}function Te(e,t,n=!1){if(!Number.isInteger(e)||e<1||e>4)throw Error(`apply codegen: per-instance channel itemSize ${e} is out of range; a channel binds as a WGSL storage array of a scalar or a vec2/vec3/vec4, so it must be a whole number in 1..4 (the planner rejects wider columns before reaching codegen)`);let r=e===3?4:e;if(t!==r)throw Error(`apply codegen: per-instance channel of itemSize ${e} spends ${r} slots per instance, not ${t}; pass the \`components\` deviceInstanceAttributeLayout returns rather than a second reading of the vec3 padding rule`);let i=new R,a=i.add(`src`,`read`,`u32`,`channel source: ${e} word(s) per point`),o=i.add(`out`,`read_write`,`u32`,`out: ${t} word(s) per instance${t===e?``:` (vec3 storage stride, [3] = 0 pad)`}`),s=n?i.add(`perm`,`read`,`u32`,`grouping permutation: source point index per slot`):``,c=n?`src`:`i`,l=t=>e===1?`${a}[${c}]`:t===0?`${a}[s]`:`${a}[s + ${t}u]`,u=e=>t===1?`${o}[i]`:e===0?`${o}[o]`:`${o}[o + ${e}u]`,d=[];n&&d.push(`  let src = ${s}[params.base + i];`),e>1&&d.push(`  let s = ${c} * ${e}u;`),t>1&&d.push(`  let o = i * ${t}u;`);for(let t=0;t<e;t++)d.push(`  ${u(t)} = ${l(t)};`);for(let n=e;n<t;n++)d.push(`  ${u(n)} = 0u;`);return z(`instanceChannel|ts=${e}|c=${t}${n?`|perm`:``}`,0,i.items,[],d.join(`
`),n)}var Ee=64,De=`wgsl2`,Oe=[`x`,`y`,`z`,`w`];function V(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function ke(e,t,n){return new M(`${e}: ${t} has tupleSize ${n}, but GPU kernels support tuple sizes 1 to 4; evaluate this field on the CPU instead, or split it into components`)}function H(e,t,n){let r=1;for(let i of n)if(i!==1){if(r!==1&&r!==i)throw new M(`${t}: ${e}: incompatible tuple sizes ${r} and ${i}`);r=i}return r}var Ae=class{layout;params;lines=[];libRoots=new Set;usesSeed=!1;letScope=[];valueNumbers=new Map;bindings=new Map;helpers=new Map;helperTexts=[];helperCounters=new Map;varCounter=0;constructor(e,t,n){this.layout=e,this.params=n,t.forEach((t,n)=>{this.bindings.set(t,{name:t,varName:`in${n}`,binding:n+1,attr:e.attributes[t]})})}paramSlot(e){let t=this.params.slots.get(e);if(t===void 0)throw Error(`internal: param ${JSON.stringify(e)} was not pre-planned`);return{slot:t,arity:this.params.arities[t]}}attrIsSlot(e,t){let n=this.params.attrIsSlots.get(rt(e,t));if(n===void 0)throw Error(`internal: attributeIs ${rt(e,t)} was not pre-planned`);return n}emit(e,t){let n=this.valueNumbers.get(e);if(n)return n;let r={ref:`v${this.varCounter++}`,size:t};return this.lines.push(`  let ${r.ref} = ${e};`),this.valueNumbers.set(e,r),r}binding(e){let t=this.bindings.get(e);if(!t)throw Error(`internal: attribute ${JSON.stringify(e)} was not pre-bound`);return t}boundAttrs(){return[...this.bindings.values()]}helper(e,t){let n=this.helpers.get(t);if(n)return n;let r=this.helperCounters.get(e)??0;this.helperCounters.set(e,r+1);let i=`pcg_${e}_${r}`;return this.helpers.set(t,i),this.helperTexts.push(t.replaceAll(`@NAME@`,i)),i}helperBlocks(){return this.helperTexts}};function U(e,t){return e.size===t?e.ref:`vec${t}<f32>(${e.ref})`}function W(e){return e===1?`0f`:`vec${e}<f32>(0f)`}function G(e){return e===1?`1f`:`vec${e}<f32>(1f)`}function je(e,t){return e===1?t:`vec${e}<f32>(${t})`}function Me(e){let t=Object.keys(e.attributes).sort();return t.length===0?`the layout declares no attributes`:`layout attributes: ${t.map(e=>JSON.stringify(e)).join(`, `)}`}function Ne(e,t,n,r,i){let a=e.layout.attributes;if(!Object.hasOwn(a,n))throw new M(`${t}: ${i}attribute ${JSON.stringify(n)} is not in the kernel layout; ${Me(e.layout)}`);let o=a[n];if(o.type===`string`)throw new M(`${t}: ${i}attribute ${JSON.stringify(n)} has type "string"; a string column has no numeric value to read — test it with { fn: "attributeIs", name: ${JSON.stringify(n)}, value: "..." }, which is 1 where it matches and 0 elsewhere, or select on it with { fn: "byAttribute", name: ${JSON.stringify(n)}, cases: {...}, default: ... }, or read a numeric or bool attribute`);if(r!==void 0&&o.tupleSize!==r)throw new M(`${t}: ${i}attribute ${JSON.stringify(n)}: expected tupleSize ${r}, got ${o.tupleSize} in the kernel layout`);if(o.tupleSize>4)throw ke(t,`${i}attribute ${JSON.stringify(n)}`,o.tupleSize);return o}function Pe(e,t,n,r,i){let a=Ne(e,t,n,r,i),o=e.binding(n),s=a.tupleSize,c=e=>a.type===`f32`?e:`f32(${e})`;if(s===1)return e.emit(c(`${o.varName}[i]`),1);let l=[];for(let e=0;e<s;e++)l.push(c(`${o.varName}[${K(s,e)}]`));return e.emit(`vec${s}<f32>(${l.join(`, `)})`,s)}function K(e,t){return e===1?`i`:t===0?`i * ${e}u`:`i * ${e}u + ${t}u`}var q=new Map;function Fe(){return[...q.keys()].sort()}var Ie=new Set([`worleyFeature`]);function Le(){return Fe().filter(e=>!Ie.has(e))}function Re(e,t,n){let r=String(e.fn),i=q.get(r);if(!i)throw new M(`${t}: field fn "${r}" is not supported by the WGSL compiler; supported fns: ${Le().join(`, `)}`);return i(e,t,n)}function J(e,t,n){return typeof e==`number`?n.emit(N(e,t),1):Array.isArray(e)?ze(e,t,n):Re(e,t,n)}function ze(e,t,n){let r=e.length;if(r>4)throw ke(t,`constant`,r);if(r===1)return n.emit(N(e[0],t),1);let i=e.map(e=>N(e,t));return n.emit(`vec${r}<f32>(${i.join(`, `)})`,r)}function Y(e){return e.args}q.set(`constant`,(e,t,n)=>{let r=e.value;return typeof r==`number`?n.emit(N(r,`${t}.value`),1):ze(r,`${t}.value`,n)}),q.set(`attribute`,(e,t,n)=>{let r=e.name,i=e.tupleSize;return Pe(n,t,r,i,``)});function Be(e,t,n,r,i){let a=e.layout.attributes;if(!Object.hasOwn(a,n))throw new M(`${t}: ${r}: attribute ${JSON.stringify(n)} is not in the kernel layout; ${Me(e.layout)}`);let o=a[n];if(o.type!==`string`)throw new M(`${t}: ${r}: attribute ${JSON.stringify(n)} has type ${JSON.stringify(o.type)}, but ${r} ${i} a string attribute; compare a numeric attribute with { fn: "eq", args: [{ fn: "attribute", name: ${JSON.stringify(n)} }, <number>] }`);return o}q.set(`attributeIs`,(e,t,n)=>{let r=e.name,i=e.value,a=Be(n,t,r,`attributeIs`,`tests`),o=n.binding(r),s=n.attrIsSlot(r,i);return n.emit(`select(0f, 1f, f32(${o.varName}[${K(a.tupleSize,0)}]) == params.consts[${s}].x)`,1)}),q.set(`byAttribute`,(e,t,n)=>{let r=e.name,i=e.cases,a=Be(n,t,r,`byAttribute`,`selects on`),o=n.binding(r),s=Object.keys(i).sort(),c=s.map(e=>J(i[e],`${t}.cases[${JSON.stringify(e)}]`,n)),l=J(e.default,`${t}.default`,n),u=H(`byAttribute`,t,[...c.map(e=>e.size),l.size]),d=n.emit(`f32(${o.varName}[${K(a.tupleSize,0)}])`,1),f=U(l,u);return s.forEach((e,t)=>{let i=n.attrIsSlot(r,e);f=`select(${f}, ${U(c[t],u)}, ${d.ref} == params.consts[${i}].x)`}),n.emit(f,u)}),q.set(`position`,(e,t,n)=>Pe(n,t,`P`,3,`position reads `)),q.set(`param`,(e,t,n)=>{let r=e.name,i=h(e);if(i!==void 0){let e=n.letScope;n.letScope=[];try{return Re(i,`${t}<${r}>`,n)}finally{n.letScope=e}}let{slot:a,arity:o}=n.paramSlot(r),s=e=>`params.consts[${a}].${Oe[e]}`;return o===1?n.emit(s(0),1):n.emit(`vec${o}<f32>(${Array.from({length:o},(e,t)=>s(t)).join(`, `)})`,o)}),q.set(`let`,(e,t,n)=>{let r=e.bind;if(!V(r))throw new M(`${t}: let: needs a "bind" object`);let i=Y(e);if(i.length!==1)throw new M(`${t}: let: needs exactly one body arg, got ${i.length}`);let a=n.letScope.length;try{for(let[e,i]of Object.entries(r))n.letScope.push({name:e,spec:i,path:`${t}.bind.${e}`,depth:n.letScope.length});return J(i[0],`${t}.args[0]`,n)}finally{n.letScope.length=a}}),q.set(`var`,(e,t,n)=>{let r=e.name,i;for(let e=n.letScope.length-1;e>=0&&i===void 0;e--)n.letScope[e].name===r&&(i=n.letScope[e]);if(i===void 0)throw new M(`${t}: var ${JSON.stringify(r)}: no let binding of that name is in scope`);if(i.val===void 0){let e=n.letScope;n.letScope=e.slice(0,i.depth);try{i.val=J(i.spec,i.path,n)}finally{n.letScope=e}}return i.val}),q.set(`box`,(e,t,n)=>{let r=e.name;return Re(g[r],`${t}<box ${r}>`,n)}),q.set(`index`,(e,t,n)=>n.emit(`f32(i)`,1)),q.set(`fraction`,(e,t,n)=>n.emit(`f32(i) / f32(max(params.count, 2u) - 1u)`,1)),q.set(`nodeSeed`,(e,t,n)=>(n.usesSeed=!0,n.emit(`f32(params.seed >> 8u) * 256.0 + f32(params.seed & 0xFFu)`,1))),q.set(`randomField`,(e,t,n)=>{let r=e.key,i=typeof r==`string`?j(r):(r??0)>>>0;n.usesSeed=!0,n.libRoots.add(`pcg_hash3`),n.libRoots.add(`pcg_hash4`),n.libRoots.add(`pcg_hash_float`);let a=`randomField's per-point identity reads `,o=Ne(n,t,`P`,void 0,a);if(o.tupleSize<3)throw new M(`${t}: ${a}attribute "P" with x, y and z (tupleSize 3), got tupleSize ${o.tupleSize}`);let s=n.binding(`P`).varName,c=e=>{let t=`${s}[${K(o.tupleSize,e)}]`;return o.type===`f32`?`bitcast<u32>(${t})`:`bitcast<u32>(f32(${t}))`},l=`0u`,u=Object.hasOwn(n.layout.attributes,`seed`)?n.layout.attributes.seed:void 0;if(u!==void 0){if(u.tupleSize!==1||u.type!==`u32`&&u.type!==`i32`)throw new M(`${t}: ${a}the standard point attribute "seed" as a u32 or i32 scalar, but the layout has it as ${u.type}x${u.tupleSize}; this field resolves on the CPU instead`);let e=n.binding(`seed`).varName;l=u.type===`u32`?`${e}[i]`:`bitcast<u32>(${e}[i])`}let d=`pcg_hash4(${c(0)}, ${c(1)}, ${c(2)}, ${l})`;return n.emit(`pcg_hash_float(pcg_hash3(params.seed, ${P(i)}, ${d}))`,1)}),q.set(`randomFrom`,(e,t,n)=>{let r=e.key,i=typeof r==`string`?j(r):(r??0)>>>0,a=J(Y(e)[0],`${t}.args[0]`,n);if(a.size!==1)throw new M(`${t}: randomFrom's key must be ONE number per element, got width ${a.size}; reduce it first, e.g. component(<expr>, 0)`);return n.usesSeed=!0,n.libRoots.add(`pcg_hash3`),n.libRoots.add(`pcg_hash_float`),n.emit(`pcg_hash_float(pcg_hash3(params.seed, ${P(i)}, bitcast<u32>(${U(a,1)})))`,1)});function X(e,t,n){q.set(e,(r,i,a)=>{let o=Y(r),s=[];for(let e=0;e<t;e++)s.push(J(o[e],`${i}.args[${e}]`,a));let c=H(e,i,s.map(e=>e.size)),l=s.map(e=>U(e,c));return a.emit(n(l,c),c)})}X(`add`,2,e=>`${e[0]} + ${e[1]}`),X(`sub`,2,e=>`${e[0]} - ${e[1]}`),X(`mul`,2,e=>`${e[0]} * ${e[1]}`),X(`div`,2,e=>`${e[0]} / ${e[1]}`),X(`min`,2,e=>`min(${e[0]}, ${e[1]})`),X(`max`,2,e=>`max(${e[0]}, ${e[1]})`),X(`abs`,1,e=>`abs(${e[0]})`),X(`floor`,1,e=>`floor(${e[0]})`),X(`trunc`,1,e=>`trunc(${e[0]})`),X(`fract`,1,e=>`${e[0]} - floor(${e[0]})`),X(`mod`,2,e=>`${e[0]} - ${e[1]} * floor(${e[0]} / ${e[1]})`),X(`rem`,2,e=>`${e[0]} - ${e[1]} * trunc(${e[0]} / ${e[1]})`),X(`sign`,1,(e,t)=>`select(${W(t)}, ${G(t)}, ${e[0]} > ${W(t)}) - select(${W(t)}, ${G(t)}, ${e[0]} < ${W(t)})`),X(`sin`,1,e=>`sin(${e[0]})`),X(`cos`,1,e=>`cos(${e[0]})`),X(`tan`,1,e=>`tan(${e[0]})`),X(`asin`,1,e=>`asin(${e[0]})`),X(`acos`,1,e=>`acos(${e[0]})`),X(`atan`,1,e=>`atan(${e[0]})`),X(`atan2`,2,e=>`atan2(${e[0]}, ${e[1]})`),X(`sqrt`,1,e=>`sqrt(${e[0]})`),X(`pow`,2,e=>`pow(${e[0]}, ${e[1]})`),X(`exp`,1,e=>`exp(${e[0]})`),X(`exp2`,1,e=>`exp2(${e[0]})`),X(`log`,1,e=>`log(${e[0]})`),X(`log2`,1,e=>`log2(${e[0]})`),X(`clamp`,3,e=>`clamp(${e[0]}, ${e[1]}, ${e[2]})`),X(`lerp`,3,e=>`${e[0]} + (${e[1]} - ${e[0]}) * ${e[2]}`),X(`select`,3,(e,t)=>`select(${e[2]}, ${e[1]}, ${e[0]} != ${W(t)})`),X(`lt`,2,(e,t)=>`select(${W(t)}, ${G(t)}, ${e[0]} < ${e[1]})`),X(`le`,2,(e,t)=>`select(${W(t)}, ${G(t)}, ${e[0]} <= ${e[1]})`),X(`gt`,2,(e,t)=>`select(${W(t)}, ${G(t)}, ${e[0]} > ${e[1]})`),X(`ge`,2,(e,t)=>`select(${W(t)}, ${G(t)}, ${e[0]} >= ${e[1]})`),X(`eq`,2,(e,t)=>`select(${W(t)}, ${G(t)}, ${e[0]} == ${e[1]})`),X(`ne`,2,(e,t)=>`select(${W(t)}, ${G(t)}, ${e[0]} != ${e[1]})`),X(`step`,2,(e,t)=>`select(${W(t)}, ${G(t)}, ${e[1]} >= ${e[0]})`),q.set(`remap`,(e,t,n)=>{let r=Y(e).map((e,r)=>J(e,`${t}.args[${r}]`,n)),i=H(`remap`,t,r.map(e=>e.size)),[a,o,s,c,l]=r.map(e=>U(e,i)),u=n.emit(`${s} - ${o}`,i),d=W(i),f=n.emit(`select(${u.ref}, ${G(i)}, ${u.ref} == ${d})`,i);return n.emit(`select(${c} + ((${a} - ${o}) / ${f.ref}) * (${l} - ${c}), ${c}, ${u.ref} == ${d})`,i)}),q.set(`dot`,(e,t,n)=>{let r=Y(e),i=J(r[0],`${t}.args[0]`,n),a=J(r[1],`${t}.args[1]`,n),o=H(`dot`,t,[i.size,a.size]);return o===1?n.emit(`${i.ref} * ${a.ref}`,1):n.emit(`dot(${U(i,o)}, ${U(a,o)})`,1)}),q.set(`cross`,(e,t,n)=>{let r=Y(e),i=J(r[0],`${t}.args[0]`,n),a=J(r[1],`${t}.args[1]`,n);for(let[e,n]of[[`a`,i],[`b`,a]])if(n.size!==3)throw new M(`${t}: cross: argument \`${e}\` has width ${n.size}, but a cross product is defined for width 3 only. Scalars do NOT broadcast into one here — build a vec3 with \`vec(x, y, z)\`, or use \`dot\` for a product that works at any width.`);return n.emit(`cross(${i.ref}, ${a.ref})`,3)}),q.set(`smoothstep`,(e,t,n)=>{let r=Y(e).map((e,r)=>J(e,`${t}.args[${r}]`,n)),i=H(`smoothstep`,t,r.map(e=>e.size)),[a,o,s]=r.map(e=>U(e,i)),c=W(i),l=G(i),u=n.emit(`select(${c}, ${l}, ${a} == ${o})`,i),d=n.emit(`${o} - ${a}`,i),f=n.emit(`select(${d.ref}, ${l}, ${u.ref} != ${c})`,i),p=n.emit(`clamp((${s} - ${a}) / ${f.ref}, ${c}, ${l})`,i),m=n.emit(`(${p.ref} * ${p.ref}) * (${je(i,`3f`)} - ${je(i,`2f`)} * ${p.ref})`,i);return n.emit(`select(${m.ref}, select(${c}, ${l}, ${s} >= ${a}), ${u.ref} != ${c})`,i)}),q.set(`distance`,(e,t,n)=>{let r=Y(e),i=J(r[0],`${t}.args[0]`,n),a=J(r[1],`${t}.args[1]`,n),o=H(`distance`,t,[i.size,a.size]),s=n.emit(`${U(i,o)} - ${U(a,o)}`,o);if(o===1)return n.emit(`abs(${s.ref})`,1);let c=n.emit(`dot(${s.ref}, ${s.ref})`,1);return n.emit(`sqrt(${c.ref})`,1)}),q.set(`length`,(e,t,n)=>{let r=J(Y(e)[0],`${t}.args[0]`,n);if(r.size===1)return n.emit(`abs(${r.ref})`,1);let i=n.emit(`dot(${r.ref}, ${r.ref})`,1);return n.emit(`sqrt(${i.ref})`,1)}),q.set(`normalize`,(e,t,n)=>{let r=J(Y(e)[0],`${t}.args[0]`,n),i=r.size===1?n.emit(`${r.ref} * ${r.ref}`,1):n.emit(`dot(${r.ref}, ${r.ref})`,1),a=n.emit(`select(0f, 1f / sqrt(${i.ref}), ${i.ref} > 0f)`,1);return n.emit(`${r.ref} * ${a.ref}`,r.size)}),q.set(`vec`,(e,t,n)=>{let r=Y(e).map((e,r)=>J(e,`${t}.args[${r}]`,n)),i=r.reduce((e,t)=>e+t.size,0);if(i>4)throw ke(t,`vec result`,i);return r.length===1?r[0]:n.emit(`vec${i}<f32>(${r.map(e=>e.ref).join(`, `)})`,i)}),q.set(`component`,(e,t,n)=>{let r=J(Y(e)[0],`${t}.args[0]`,n),i=e.index;if(i>=r.size)throw new M(`${t}: component: index ${i} out of range for tupleSize ${r.size}`);return r.size===1?r:n.emit(`${r.ref}.${Oe[i]}`,1)}),q.set(`ramp`,(e,t,n)=>{let r=J(Y(e)[0],`${t}.args[0]`,n);if(r.size!==1)throw new M(`${t}: ramp: input must be scalar, got tupleSize ${r.size}`);let i=e.stops,a=n.helper(`ramp`,He(i,`${t}.stops`));return n.emit(`${a}(${r.ref})`,1)}),q.set(`choose`,(e,t,n)=>{let r=Y(e);if(r.length<2)throw new M(`${t}: choose: needs an index and at least one case, got ${r.length} arg(s)`);let i=J(r[0],`${t}.args[0]`,n);if(i.size!==1)throw new M(`${t}: choose: the index must be scalar, got tupleSize ${i.size}`);let a=[];for(let e=1;e<r.length;e++)a.push(J(r[e],`${t}.args[${e}]`,n));let o=H(`choose`,t,a.map(e=>e.size)),s=a[0].size===o?a[0]:n.emit(U(a[0],o),o);for(let e=1;e<a.length;e++)s=n.emit(`select(${s.ref}, ${U(a[e],o)}, ${i.ref} >= ${N(e-.5,t)})`,o);return s}),q.set(`lookup`,(e,t,n)=>{let r=J(Y(e)[0],`${t}.args[0]`,n);if(r.size!==1)throw new M(`${t}: lookup: input must be scalar, got tupleSize ${r.size}`);let i=e.table,a=n.helper(`lookup`,Ve(i,`${t}.table`));return n.emit(`${a}(${r.ref})`,1)});function Ve(e,t){let n=e=>N(e,t),r=[`fn @NAME@(t: f32) -> f32 {`];for(let t=e.length-1;t>=1;t--)r.push(`  if (t >= ${n(t-.5)}) {`),r.push(`    return ${n(e[t])};`),r.push(`  }`);return r.push(`  return ${n(e[0])};`),r.push(`}`),r.join(`
`)}function He(e,t){let n=e=>N(e,t),r=e.length-1,i=[];i.push(`fn @NAME@(t: f32) -> f32 {`),i.push(`  if (t <= ${n(e[0][0])}) {`),i.push(`    return ${n(e[0][1])};`),i.push(`  }`),i.push(`  if (t >= ${n(e[r][0])}) {`),i.push(`    return ${n(e[r][1])};`),i.push(`  }`);let a=t=>{let r=e[t-1][0],i=e[t-1][1],a=e[t][0]-r,o=e[t][1]-i;return`${n(i)} + ${n(o)} * ((t - ${n(r)}) / ${n(a)})`};for(let t=1;t<r;t++)i.push(`  if (t <= ${n(e[t][0])}) {`),i.push(`    return select(${a(t)}, ${n(e[t][1])}, t == ${n(e[t][0])});`),i.push(`  }`);return r>=1?i.push(`  return ${a(r)};`):i.push(`  return t;`),i.push(`}`),i.join(`
`)}var Ue={valueNoise:e,perlinNoise:l,simplexNoise:T,worleyNoise:a},We={valueNoise:`pcg_value_noise`,perlinNoise:`pcg_perlin_noise`,simplexNoise:`pcg_simplex_noise`};function Ge(e){return e.opts??{}}function Ke(e,t,n,r){let i=Ge(t),a=i.position===void 0?n:`${n}.opts.position`,o=i.position===void 0?Pe(r,n,`P`,3,`${e} position reads `):J(i.position,a,r);if(o.size!==3)throw new M(`${a}: ${e}: position field must have tupleSize 3, got ${o.size}`);let s=N(i.frequency??1,`${n}.opts.frequency`),[c,l,u]=i.offset??[0,0,0],d=`vec3<f32>(${N(c,`${n}.opts.offset`)}, ${N(l,`${n}.opts.offset`)}, ${N(u,`${n}.opts.offset`)})`;return r.emit(`${o.ref} * ${s} + ${d}`,3)}function qe(e){return e.libRoots.add(`pcg_hash_mix`),e.libRoots.add(`pcg_hash_finalize`),e.helper(`hash2`,`fn @NAME@(a: u32, b: u32) -> u32 {
  return pcg_hash_finalize(pcg_hash_mix(pcg_hash_mix(${P(t(2))}, a), b));
}`)}function Je(e){return typeof e==`object`&&!!e}function Ye(e,t,n){if(e===void 0)return`0u`;if(typeof e==`number`)return ie(e);let r=e.name;if(typeof r!=`string`||r===``)throw new M(`${t}.opts.seed.variant: param requires a non-empty string name`);if(h(e)!==void 0)throw new M(`${t}.opts.seed.variant: param ${JSON.stringify(r)} is bound to a Field, and a seed is resolved in u32 integer math with no per-element form; bind an integer, or evaluate this field on the CPU`);let{slot:i}=n.paramSlot(r);return`u32(params.consts[${i}].x)`}function Xe(e,t,n){return Je(e)?(n.usesSeed=!0,{expr:`${qe(n)}(params.seed, ${Ye(e.variant,t,n)})`}):{literal:(e??0)>>>0}}function Ze(e,t,n){let r=Ue[e];return`literal`in t?P(te(r,t.literal)):`${qe(n)}(${P(r)}, ${t.expr})`}function Qe(e,t,n,r){let[i,a]=n,o=a-i;return e.emit(`(${t.ref} - ${N(i,r)}) / ${N(o,r)}`,1)}for(let e of[`valueNoise`,`perlinNoise`,`simplexNoise`])q.set(e,(t,n,r)=>{let i=Ge(t),a=Ze(e,Xe(i.seed,n,r),r),o=Ke(e,t,n,r);r.libRoots.add(We[e]);let s=r.emit(`${We[e]}(${a}, ${o.ref})`,1);return i.normalized===!0?Qe(r,s,x[e],`${n}.opts.normalized`):s});q.set(`worleyNoise`,(e,t,n)=>{let r=Ge(e),i=r.output??`f1`;if(i!==`f1`&&i!==`f2`&&i!==`f2-f1`)throw new M(`${t}.opts.output: worleyNoise output "${i}" is not supported by the WGSL compiler; lowerable outputs: "f1", "f2", "f2-f1". This spec resolves on the CPU instead (a "compile-error" fallback), which is byte-identical, not an approximation.`);let a=r.exact===!0,o=Ze(`worleyNoise`,Xe(r.seed,t,n),n),s=Ke(`worleyNoise`,e,t,n);n.libRoots.add(`pcg_worley`);let c=i!==`f1`,l=n.emit(`pcg_worley(${o}, ${s.ref}, ${a}, ${c})`,2),u=i===`f1`?n.emit(`${l.ref}.x`,1):i===`f2`?n.emit(`${l.ref}.y`,1):n.emit(`${l.ref}.y - ${l.ref}.x`,1);return r.normalized===!0?Qe(n,u,x.worleyNoise[i],`${t}.opts.normalized`):u}),q.set(`worleyFeature`,(e,t)=>{throw new M(`${t}: worleyFeature is not supported by the WGSL compiler. It reports WHICH feature point won a comparison, and a comparison that rounds the other way in f32 moves the answer to a different cell rather than by an ulp, which no tolerance can bound — the same reason worleyNoise refuses its "cell" output. This spec resolves on the CPU instead (a "compile-error" fallback), which is byte-identical, not an approximation.`)});function $e(e){return e===`worleyNoise`?x.worleyNoise.f1:x[e]}function et(e,t,n){return e===`worleyNoise`?`pcg_worley(${t}, ${n}, false, false).x`:`${We[e]}(${t}, ${n})`}q.set(`fbm`,(e,t,n)=>{let r=e.base,i=Ge(e),a=i.octaves??4,s=i.lacunarity??2,c=i.gain??.5,l=i.frequency??1,[u,d,f]=i.offset??[0,0,0],p=Xe(i.seed,t,n),m=i.position===void 0?t:`${t}.opts.position`,h=i.position===void 0?Pe(n,t,`P`,3,`fbm position reads `):J(i.position,m,n);if(h.size!==3)throw new M(`${m}: fbm: position field must have tupleSize 3, got ${h.size}`);let g=$e(r),_=[],v=[],y=[],b=1,x=l,S=0,C=0;for(let e=0;e<a;e++)_.push(Ze(r,`literal`in p?{literal:o(p.literal,e)}:{expr:`${qe(n)}(ns, ${ie(e)})`},n)),v.push(N(x,`${t}.opts.frequency`)),y.push(N(b,`${t}.opts.gain`)),S+=b>=0?b*g[0]:b*g[1],C+=b>=0?b*g[1]:b*g[0],b*=c,x*=s;n.libRoots.add(r===`worleyNoise`?`pcg_worley`:We[r]);let w=`vec3<f32>(${N(u,`${t}.opts.offset`)}, ${N(d,`${t}.opts.offset`)}, ${N(f,`${t}.opts.offset`)})`,ee=`fn @NAME@(p: vec3<f32>) -> f32 {
${`literal`in p?``:`  let ns = ${p.expr};\n`}  var seeds = array<u32, ${a}>(${_.join(`, `)});
  var freqs = array<f32, ${a}>(${v.join(`, `)});
  var amps = array<f32, ${a}>(${y.join(`, `)});
  var sum = 0f;
  for (var o = 0u; o < ${ie(a)}; o++) {
    sum = sum + ${et(r,`seeds[o]`,`p * freqs[o] + `+w)} * amps[o];
  }
  return sum;
}`,T=n.helper(`fbm`,ee),E=n.emit(`${T}(${h.ref})`,1);if(i.normalized!==!0)return E;if(!(C>S))throw new M(`${t}: fbm: normalized: true needs a non-degenerate output range, got [${S}, ${C}] for this octaves/gain configuration`);return Qe(n,E,[S,C],`${t}.opts.normalized`)});var tt=new Set([`valueNoise`,`perlinNoise`,`simplexNoise`,`worleyNoise`,`fbm`]);function Z(e,t){if(!V(e))return;let n=e.fn;if(n===`param`){let n=h(e);n!==void 0&&Z(n,t);return}if(n===`attribute`||n===`attributeIs`){typeof e.name==`string`&&t.add(e.name);return}if(n===`box`){typeof e.name==`string`&&Object.hasOwn(g,e.name)&&Z(g[e.name],t);return}if(n===`byAttribute`){typeof e.name==`string`&&t.add(e.name);for(let n of S(e))Z(n,t);return}if(n===`position`){t.add(`P`);return}if(n===`randomField`){t.add(`P`),t.add(`seed`);return}if(typeof n==`string`&&tt.has(n)){let n=e.opts;V(n)&&n.position!==void 0?Z(n.position,t):t.add(`P`);return}for(let n of S(e))Z(n,t)}var nt=16;function rt(e,t){return`${JSON.stringify(e)},${JSON.stringify(t)}`}var it={names:[],slots:new Map,arities:[],attrIs:[],attrIsSlots:new Map};function at(e){return typeof e==`number`?1:e.length}function ot(e,t){if(V(e)){if(t(e),e.fn===`param`){let n=h(e);n!==void 0&&ot(n,t);return}for(let n of S(e))ot(n,t)}}function st(e){let t=lt.get(e);if(t!==void 0)return t;let n=ut.get(e);if(n!==void 0)throw n;try{let t=ct(e);return lt.set(e,t),t}catch(t){throw t instanceof M&&ut.set(e,t),t}}function ct(e){let t=new Map,n=new Set,r=new Map;if(ot(e,e=>{if(e.fn===`attributeIs`){if(typeof e.name!=`string`||e.name===``||typeof e.value!=`string`)return;r.set(rt(e.name,e.value),{attr:e.name,value:e.value});return}if(e.fn===`byAttribute`){if(typeof e.name!=`string`||e.name===``||!V(e.cases))return;for(let t of Object.keys(e.cases))r.set(rt(e.name,t),{attr:e.name,value:t});return}if(e.fn!==`param`||typeof e.name!=`string`||e.name===``)return;let i=e.name;if(h(e)!==void 0)return;if(O(e))throw new M(`param ${JSON.stringify(i)} is bound to a Field that carries no spec (a makeField closure, or something composed over one), so there is nothing to compile in its place; this expression evaluates on the CPU — build the bound field with the grammar constructors or fieldFromJson if it should lower`);n.add(i);let a=v(e);if(a===void 0)return;let o=at(a);if(o>4)throw new M(`param ${JSON.stringify(i)} is bound to a ${o}-tuple, but a uniform slot holds 4 components; bind a tuple of 1 to 4, or evaluate this field on the CPU`);let s=t.get(i);if(s!==void 0&&s!==o)throw new M(`param ${JSON.stringify(i)} is bound to a ${s}-tuple in one place and a ${o}-tuple in another within the same expression; one uniform slot serves the name, so both references must have the same arity`);t.set(i,o)}),n.size===0&&r.size===0)return it;let i=[...n].sort(),a=[...r.keys()].sort(),o=i.length+a.length;if(o>nt)throw new M(`this field needs ${o} uniform constant slots (${i.length} distinct params and ${a.length} distinct string literals across its attributeIs tests and byAttribute case keys), but a kernel carries at most ${nt}; split the expression, or evaluate it on the CPU (raise MAX_FIELD_CONST_SLOTS in compile.ts if an expression legitimately needs more)`);return{names:i,slots:new Map(i.map((e,t)=>[e,t])),arities:i.map(e=>t.get(e)??1),attrIs:a.map(e=>r.get(e)),attrIsSlots:new Map(a.map((e,t)=>[e,i.length+t]))}}var lt=new WeakMap,ut=new WeakMap,dt=new WeakMap;function ft(e){let t=``;return e.names.length>0&&(t+=`|params=[${e.names.map((t,n)=>`${JSON.stringify(t)}:${e.arities[n]}`).join(`,`)}]`),e.attrIs.length>0&&(t+=`|attrIs=[${e.attrIs.map(e=>rt(e.attr,e.value)).join(`;`)}]`),t}function pt(e,t){let n=st(e);if(n.names.length===0&&n.attrIs.length===0)return t;let r=dt.get(e);if(r!==void 0)return r;let a=`${i(e).key}${ft(n)}`;return dt.set(e,a),a}function mt(e,t){return e.length===t.length&&e.every((e,n)=>Object.is(e,t[n]))}function ht(e,t){return t.constSlots===0?{values:[]}:t.attrIsSlots.length>0?{problem:`this kernel carries ${t.attrIsSlots.length} string-literal slot(s) (${t.attrIsSlots.map(e=>`${JSON.stringify(e.attr)} == ${JSON.stringify(e.value)}`).join(`, `)}) whose values are string-table indices of the geometry being cooked; fill them with constSlotValues, which takes that geometry's attribute set`}:gt(e,t)}function gt(e,t){let n=new Map,r;if(ot(e,e=>{if(e.fn!==`param`||typeof e.name!=`string`||e.name===``)return;let t=e.name;if(h(e)!==void 0)return;let i=v(e);if(i===void 0){r??=`param ${JSON.stringify(t)} has no bound value`;return}let a=typeof i==`number`?[i]:[...i],o=n.get(t);o===void 0?n.set(t,a):mt(o,a)||(r??=`param ${JSON.stringify(t)} is bound to two different values in one expression`)}),r!==void 0)return{problem:r};let i=[];for(let e of t.paramNames){let t=n.get(e);if(t===void 0)return{problem:`param ${JSON.stringify(e)} is not referenced by this spec`};for(let e=0;e<4;e++)i.push(e<t.length?t[e]:0)}return{values:i}}var _t=-1;function vt(e,t,n){if(t.constSlots===0)return{values:[]};let r=gt(e,t);if(`problem`in r||t.attrIsSlots.length===0)return r;let i=[...r.values];for(let e of t.attrIsSlots){let t=n.get(e.attr);if(t===void 0||t.type!==`string`)return{problem:`attributeIs ${JSON.stringify(e.attr)}: this geometry has no string attribute of that name (${t===void 0?`no such attribute`:`it is ${t.type}`}), so the literal has no index to resolve to`};let r=t.lookupString(e.value)??_t;for(let e=0;e<4;e++)i.push(e===0?r:0)}return{values:i}}var yt=new Set([`f32`,`i32`,`u32`,`bool`,`string`]);function bt(e){if(!V(e)||!V(e.attributes))throw new M(`compileFieldSpec: layout must be { attributes: { name: { type, tupleSize } } }`);for(let[t,n]of Object.entries(e.attributes)){if(!V(n)||!yt.has(n.type))throw new M(`kernel layout attribute ${JSON.stringify(t)}: unknown type ${JSON.stringify(n?.type)}; valid types: "f32", "i32", "u32", "bool", "string" (a string column binds as u32 and is readable only through attributeIs)`);let e=n.tupleSize;if(typeof e!=`number`||!Number.isInteger(e)||e<1)throw new M(`kernel layout attribute ${JSON.stringify(t)}: tupleSize must be a positive integer, got ${String(e)}`)}}function xt(e){return typeof e==`number`?{fn:`constant`,value:e}:Array.isArray(e)?{fn:`constant`,value:[...e]}:e}function St(e){return e.type===`bool`||e.type===`string`?`u32`:e.type}function Ct(e){let t=new Map,n=e;for(let r=0;r<=256;r++){if(!V(n))return e;if(n.fn===`let`&&V(n.bind)&&Array.isArray(n.args)){for(let[e,r]of Object.entries(n.bind))t.set(e,r);n=n.args[0]}else if(n.fn===`var`&&typeof n.name==`string`&&t.has(n.name))n=t.get(n.name);else if(n.fn===`box`&&typeof n.name==`string`&&Object.hasOwn(g,n.name))n=g[n.name];else return n}return e}function wt(e,t){bt(t);let n=xt(e),r=i(n),a=new Set;Z(n,a);let o=[...a].filter(e=>Object.hasOwn(t.attributes,e)).sort(),s=st(n),c=new Ae(t,o,s),l=`f32`,u=0,d=[],f=e=>{if(u=e.size,e.size===1)d.push(`  outBuf[i] = ${e.ref};`);else for(let t=0;t<e.size;t++)d.push(`  outBuf[${K(e.size,t)}] = ${e.ref}.${Oe[t]};`)},p=Ct(n),m=p.fn===`attribute`?p.name:p.fn===`position`?`P`:void 0;if(p.fn===`index`)l=`u32`,u=1,d.push(`  outBuf[i] = i;`);else if(m!==void 0){let e=Ne(c,`$`,m,p.fn===`position`?3:p.tupleSize,p.fn===`position`?`position reads `:``);if(e.type===`i32`||e.type===`u32`){l=e.type,u=e.tupleSize;let t=c.binding(m);for(let n=0;n<e.tupleSize;n++)d.push(`  outBuf[${K(e.tupleSize,n)}] = ${t.varName}[${K(e.tupleSize,n)}];`)}else f(Re(n,`$`,c))}else f(Re(n,`$`,c));let h=c.boundAttrs(),g=h.map(e=>({name:e.name,type:St(e.attr),tupleSize:e.attr.tupleSize,binding:e.binding})),_=h.length+1,v=[`@group(0) @binding(0) var<uniform> params: PcgParams;`];for(let e of h)v.push(`@group(0) @binding(${e.binding}) var<storage, read> ${e.varName}: array<${St(e.attr)}>; // attribute ${JSON.stringify(e.name)}: ${e.attr.type} tupleSize ${e.attr.tupleSize}`);v.push(`@group(0) @binding(${_}) var<storage, read_write> outBuf: array<${l}>;`);let y=s.names.length+s.attrIs.length,b=[`// Generated by pcg-ts compileFieldSpec (WGSL field kernel).
// Dispatch: 1D, chunked; each chunk runs ceil(chunkElements / ${Ee}) workgroups of ${Ee}
// with element index i = chunkOffset + gid.x; one invocation per element.

struct PcgParams {
  count: u32,
  seed: u32,
  chunkOffset: u32,${y===0?``:`\n  _pad0: u32,\n  consts: array<vec4<f32>, ${y}>,`}
}

${v.join(`
`)}`,...le(c.libRoots),...c.helperBlocks(),`@compute @workgroup_size(${Ee})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x + params.chunkOffset;
  if (i >= params.count) {
    return;
  }
${[...c.lines,...d].join(`
`)}
}`],x=h.map(e=>`${JSON.stringify(e.name)}:${e.attr.type}x${e.attr.tupleSize}`).join(`,`),S=`${r.key}${ft(s)}`;return dt.set(n,S),{wgsl:`${b.join(`

`)}\n`,entryPoint:`main`,workgroupSize:Ee,outTupleSize:u,outType:l,inputs:g,bindings:{uniforms:0,output:_},constSlots:y,paramNames:s.names,attrIsSlots:s.attrIs,uniformBytes:de(y),usesSeed:c.usesSeed,key:`${De}|spec=${S}|layout=[${x}]`}}function Tt(e){return e}var Q={MAP_READ:1,COPY_SRC:4,COPY_DST:8,VERTEX:32,UNIFORM:64,STORAGE:128},Et={READ:1},Dt=256;function Ot(e){let t=Dt;for(;t<e;)t*=2;return t}var kt=class{device;maxPooledBytes;free=new Map;meta=new Map;detachedSet=new WeakSet;idleBytes=0;idleCount=0;created=0;reused=0;destroyed=0;detachedTotal=0;detachedLive=0;detachedLiveBytes=0;constructor(e,t){this.device=e,this.maxPooledBytes=t}acquire(e,t){let n=Ot(e),r=`${t}|${n}`,i=this.free.get(r)?.pop();if(i!==void 0)return this.idleBytes-=n,this.idleCount--,this.reused++,i;let a=this.device.createBuffer({size:n,usage:t});return this.meta.set(a,{key:r,bytes:n}),this.created++,a}release(e){let t=this.meta.get(e);if(t===void 0)throw this.detachedSet.has(e)?Error(`BufferPool.release: buffer was detached from this pool, so the pool no longer owns it and cannot reclaim it; destroy it through the DetachedBuffer that detach() returned (or the handle wrapping it) and stop releasing it`):Error(`BufferPool.release: buffer was not acquired from this pool`);if(this.idleBytes+t.bytes>this.maxPooledBytes){this.meta.delete(e),e.destroy(),this.destroyed++;return}let n=this.free.get(t.key);n===void 0&&(n=[],this.free.set(t.key,n)),n.push(e),this.idleBytes+=t.bytes,this.idleCount++}detach(e){let t=this.meta.get(e);if(t===void 0)throw Error(this.detachedSet.has(e)?`BufferPool.detach: buffer was already detached from this pool; ownership can only leave once — reuse the DetachedBuffer the first detach() returned`:`BufferPool.detach: buffer was not acquired from this pool`);this.meta.delete(e),this.detachedSet.add(e),this.detachedTotal++,this.detachedLive++,this.detachedLiveBytes+=t.bytes;let n=!1,r=this;return{buffer:e,bytes:t.bytes,get destroyed(){return n},destroy(){n||(n=!0,r.detachedLive--,r.detachedLiveBytes-=t.bytes,r.destroyed++,e.destroy())}}}get stats(){return{buffersCreated:this.created,buffersReused:this.reused,buffersDestroyed:this.destroyed,pooledBuffers:this.idleCount,pooledBytes:this.idleBytes,buffersDetached:this.detachedTotal,detachedBuffers:this.detachedLive,detachedBytes:this.detachedLiveBytes}}dispose(){for(let e of this.free.values())for(let t of e)this.meta.delete(t),t.destroy(),this.destroyed++;this.free.clear(),this.idleBytes=0,this.idleCount=0}},At=`webgpu`,jt=class{backend=At;byteLength;detached;label;constructor(e,t,n){this.detached=e,this.byteLength=t,this.label=n}get disposed(){return this.detached.destroyed}get resource(){if(this.detached.destroyed)throw Error(`device transforms handle (${this.label}) was disposed; its GPU buffer is destroyed and cannot be bound. Dispose a handle only after the last frame that reads it, and re-cook to obtain a fresh one (device-resident outputs are never memoized, so every cook produces a new handle)`);return this.detached.buffer}dispose(){this.detached.destroy()}};function Mt(e,t,n){return new jt(e,t,n)}var Nt=65535;function Pt(e,t){let n=Nt*e;return Math.max(e,Math.floor(Math.min(t??n,n)/e)*e)}var Ft=16,It=`pcg-resident-run/6`;function Lt(e){return e.format===It?e:null}var Rt={reason:`run-plan-failed`},zt=[`+x`,`-x`,`+y`,`-y`,`+z`,`-z`];function Bt(e){if(typeof e!=`object`||!e||Array.isArray(e))return!1;let t=e;if(t.fn===`randomField`)return!0;for(let e of S(t))if(Bt(e))return!0;return!1}function Vt(e){return Array.isArray(e)&&e.length===3&&e.every(e=>typeof e==`number`&&Number.isFinite(e))}var $=class extends Error{};function Ht(e,t,n,r,i){let a=[...e].map(([e,t])=>({name:e,slot:t})),o=i||r===null,s=t.reduce((e,t)=>e+t.bytes,0),c=n.reduce((e,t)=>e+t,0),l=o?a.reduce((e,n)=>e+t[n.slot].bytes,0):0;return{writtenList:a,materialize:o,totalBytes:s+c+l+(r?.bytes??0)+(r?.colorBytes??0)+(r?.channelBytes??0)+(r?.permBytes??0)}}function Ut(e,t,n,i,a={}){let s=a.deviceInstanceAttrs===!0,c=t.count,l=new Map(Object.entries(t.attributes)),u=[],d=new Map,m=[],h=new Map,g=[],_=[],v=null,y=()=>Object.fromEntries(l),b=e=>{let t=d.get(e);if(t!==void 0)return t;let n=l.get(e);if(n===void 0||n.type===`string`)throw new $(e);let r=u.length;return u.push({bytes:c*n.tupleSize*4,init:`attr`,name:e}),d.set(e,r),r},x=(e,t,n)=>{let r=u.length;return u.push({bytes:c*t*4,init:n,name:e}),d.set(e,r),r},S=(e,t,n)=>{let r=l.get(e);if(r===void 0||r.type!==t||r.tupleSize!==n)throw new $(e)},C=(e,t,n)=>{let r=t.length/4;if(r>=4)throw Error(`resident run: "${n}" needs more than 4 uniform constant slots for its constant params; raise MAX_APPLY_CONST_SLOTS in applyKernels.ts (each slot costs 16 bytes of the per-chunk uniform and nothing else)`);for(let n=0;n<4;n++)t.push(n<e.length?e[n]:0);return{kind:`const`,tupleSize:e.length,slot:r}},w=(e,t,n,a,o,s)=>{let l;if(r(e)){let t=p(e,i);if(t===void 0)throw new $(`no spec`);if(h.has(`P`)&&Bt(t))throw new $(`identity after P write`);l=t}else if(typeof e==`number`||Array.isArray(e)&&e.every(e=>typeof e==`number`)){let t=typeof e==`number`?[e]:e;if(t.length<1||t.length>4||a!==null&&!a.includes(t.length))throw new $(`tuple`);for(let e of t)if(!Number.isFinite(Math.fround(e)))throw new $(`f32 range`);return{param:C(t,o,s),ref:null}}else throw new $(`bad param value`);let u;try{u=wt(l,{attributes:y()})}catch{throw new $(`compile`)}if(u.inputs.length+1>8)throw new $(`buffers`);if(a!==null&&!a.includes(u.outTupleSize))throw new $(`tuple`);if(u.attrIsSlots.length>0)throw new $(`attributeIs / byAttribute need a per-dispatch string table`);let d=ht(l,u);if(`problem`in d)throw new $(`param bindings`);let f=m.length;return m.push(c*u.outTupleSize*4),n.push({key:u.key,wgsl:u.wgsl,entryPoint:u.entryPoint,workgroupSize:u.workgroupSize,seed:t,uniformsBinding:u.bindings.uniforms,uniformBytes:u.uniformBytes,consts:d.values,perBatch:!1,bindings:[...u.inputs.map(e=>({binding:e.binding,ref:{kind:`slot`,index:b(e.name)}})),{binding:u.bindings.output,ref:{kind:`col`,index:f}}]}),{param:{kind:`column`,type:u.outType,tupleSize:u.outTupleSize},ref:{kind:`col`,index:f}}},T=(e,t,n,r,i=!1)=>{if(e.constSlots*4!==r.length)throw Error(`resident run: apply kernel "${e.key}" declares ${e.constSlots} constant slots but the planner allocated ${r.length/4}`);return{key:e.key,wgsl:e.wgsl,entryPoint:e.entryPoint,workgroupSize:e.workgroupSize,seed:t,uniformsBinding:0,uniformBytes:e.uniformBytes,consts:r,perBatch:i,bindings:e.bindings.map(e=>{let t=n[e.role];if(t===void 0)throw new $(`unmapped role ${e.role}`);return{binding:e.binding,ref:t}})}};try{for(let t of e){let n=t===e[e.length-1],r=[],i=[],a=t.params;switch(t.kind){case`setAttribute`:{let e=a.name,n=a.type,s=a.tupleSize;if(typeof e!=`string`)throw new $(`name`);if(n!==`f32`&&n!==`i32`&&n!==`u32`&&n!==`bool`)throw new $(`type`);if(typeof s!=`number`||!Number.isInteger(s)||s<1||s>4)throw new $(`tupleSize`);let c=typeof a.seed==`number`?a.seed:NaN,u=c===0?t.seed:o(t.seed,c),{param:d,ref:f}=w(a.value,u,r,s===1?[1]:[1,s],i,t.kind),p=x(e,s,`none`);l.set(e,{type:n,tupleSize:s}),h.set(e,p),g.push({op:`replace`,name:e,type:n,tupleSize:s});let m={target:{kind:`slot`,index:p}};f!==null&&(m.value=f),r.push(T(ve(d,n,s),0,m,i));break}case`transformPoints`:{S(`P`,`f32`,3);let e=w(a.translate,t.seed,r,[1,3],i,t.kind),n=w(a.rotateEuler,t.seed,r,[1,3],i,t.kind),o=w(a.scale,t.seed,r,[1,3],i,t.kind),s=l.get(`rot`),c=s!==void 0&&s.type===`f32`&&s.tupleSize===4,u=l.get(`scale`),d=u!==void 0&&u.type===`f32`&&u.tupleSize===3,f=b(`P`);h.set(`P`,f);let p={P:{kind:`slot`,index:f}};if(e.ref!==null&&(p.translate=e.ref),n.ref!==null&&(p.rotateEuler=n.ref),o.ref!==null&&(p.scale=o.ref),c){let e=b(`rot`);h.set(`rot`,e),p.rot={kind:`slot`,index:e}}if(d){let e=b(`scale`);h.set(`scale`,e),p.scaleAttr={kind:`slot`,index:e}}r.push(T(be(e.param,n.param,o.param,c,d),0,p,i));break}case`jitterPoints`:{if(S(`P`,`f32`,3),h.has(`P`))throw new $(`identity after P write`);let e=typeof a.seed==`number`?a.seed:NaN,n=o(t.seed,e),s=w(a.amount,n,r,[1,3],i,t.kind),c=l.get(`seed`),u=c!==void 0;if(u&&(c.type!==`u32`||c.tupleSize!==1))throw new $(`seed attribute shape`);let d=b(`P`);h.set(`P`,d);let f={P:{kind:`slot`,index:d}};s.ref!==null&&(f.amount=s.ref),u&&(f.seed={kind:`slot`,index:b(`seed`)}),r.push(T(xe(s.param,u),n,f,i));break}case`orientAlongVector`:{let e=a.axis;if(!zt.includes(e))throw new $(`axis`);if(!Vt(a.up))throw new $(`up`);let n=w(a.direction,t.seed,r,[1,3],i,t.kind),o=a.up,s=o[0]*o[0]+o[1]*o[1]+o[2]*o[2],c=s>0?1/Math.sqrt(s):0,u=[o[0]*c,o[1]*c,o[2]*c];for(let e of u)if(!Number.isFinite(Math.fround(e)))throw new $(`up range`);let d=C(u,i,t.kind),f=l.get(`rot`),p=f!==void 0&&f.type===`f32`&&f.tupleSize===4?b(`rot`):x(`rot`,4,`quat-default`);l.set(`rot`,{type:`f32`,tupleSize:4}),h.set(`rot`,p),g.push({op:`ensure-rot`});let m={rot:{kind:`slot`,index:p}};n.ref!==null&&(m.direction=n.ref),r.push(T(Ce(n.param,e,d),0,m,i));break}case`spawnInstances`:{if(!n)throw new $(`spawnInstances must be the run's last member`);let e=a.assetId;if(typeof e!=`string`||e===``)throw new $(`assetId`);if(S(`P`,`f32`,3),c>1048576)throw new $(`${c} instances over MAX_INSTANCES`);let t=a.assetAttr;if(t!==void 0&&typeof t!=`string`)throw new $(`assetAttr`);let o=t===void 0?``:t;if(o!==``){let e=l.get(o);if(e===void 0)throw new $(`assetAttr "${o}" not on the point domain`);if(e.type!==`string`)throw new $(`assetAttr "${o}" is ${e.type}, not string`)}let u=a.instanceAttrs,d=[];if(u!==void 0){if(!Array.isArray(u))throw new $(`instanceAttrs`);if(u.length>0&&!s)throw new $(`instanceAttrs names ${u.length} per-instance channel(s) and this resolver did not opt in to device channels (deviceInstanceAttrs)`);let e=new Set;for(let t of u){if(typeof t!=`string`)throw new $(`instanceAttrs entry is not a string`);if(t===``)throw new $(`instanceAttrs contains an empty name`);if(e.has(t))throw new $(`instanceAttrs names "${t}" twice`);if(e.add(t),t===`color`)throw new $(`instanceAttrs cannot carry "${ee}" — the name is reserved for per-instance RGB (colorAttr is the route)`);let n=l.get(t);if(n===void 0)throw new $(`instanceAttrs "${t}" not on the point domain`);if(n.type===`string`)throw new $(`instanceAttrs "${t}" is a string attribute`);if(!Number.isInteger(n.tupleSize)||n.tupleSize<1||n.tupleSize>4)throw new $(`instanceAttrs "${t}" has tupleSize ${n.tupleSize}; a device channel binds as a scalar or a vec2/vec3/vec4`);let r;try{r=f(n.type,n.tupleSize)}catch{throw new $(`instanceAttrs "${t}" has no device channel layout`)}d.push({name:t,type:n.type,itemSize:n.tupleSize,components:r.components,byteStride:r.byteStride})}}let p=a.colorAttr;if(p!==void 0&&typeof p!=`string`)throw new $(`colorAttr`);let m=p===void 0?``:p,h=0;if(m!==``){let e=l.get(m);if(e===void 0)throw new $(`colorAttr "${m}" not on the point domain`);if(e.type!==`f32`||e.tupleSize<3)throw new $(`colorAttr "${m}" is ${e.type}x${e.tupleSize}`);h=e.tupleSize}let g=l.get(`rot`),_=g!==void 0&&g.type===`f32`&&g.tupleSize===4,y=l.get(`scale`),x=y!==void 0&&y.type===`f32`&&y.tupleSize===3,C={P:{kind:`slot`,index:b(`P`)},transforms:{kind:`out`}};_&&(C.rot={kind:`slot`,index:b(`rot`)}),x&&(C.scaleAttr={kind:`slot`,index:b(`scale`)});let w=o!==``;w&&(C.perm={kind:`perm`}),h>0&&(C.color={kind:`slot`,index:b(m)},C.colors={kind:`colorOut`}),r.push(T(we(_,x,w,h),0,C,i,w)),d.forEach((e,t)=>{let n={src:{kind:`slot`,index:b(e.name)},out:{kind:`channelOut`,index:t}};w&&(n.perm={kind:`perm`}),r.push(T(Te(e.itemSize,e.components,w),0,n,[],w))}),v={assetId:e,assetAttr:o,colorAttr:m,colorTupleSize:h,count:c,bytes:c*64,colorBytes:h>0?c*Ft:0,channels:d,channelBytes:d.reduce((e,t)=>e+c*t.byteStride,0),permBytes:w?c*4:0};break}default:throw new $(`unknown kind ${t.kind}`)}_.push({id:t.id,type:t.type,steps:r})}}catch(e){if(e instanceof $)return Rt;throw e}let{writtenList:E,materialize:D,totalBytes:O}=Ht(h,u,m,v,t.needsGeometry);return O>n?{reason:`run-too-large`}:{plan:{format:It,count:c,members:_,slots:u,cols:m,written:E,layoutOps:g,materialize:D,instances:v,totalBytes:O}}}var Wt={f32:Float32Array,i32:Int32Array,u32:Uint32Array};function Gt(){return new Promise(e=>setTimeout(e,0))}async function Kt(e,t,r,i){let{device:a,pool:o}=e,{geo:c,signal:l,budgetMs:d}=r,f=t.count;if(c.attrs.point.count!==f)throw Error(`resident run: plan was built for ${f} points but the input geometry has ${c.attrs.point.count}; plans are single-cook artifacts — re-plan for new inputs`);let p=()=>{if(l?.aborted)throw new A},m=[],h=(e,t)=>{let n=o.acquire(e,t);return m.push(n),n},g=new Set,_=[];try{let r=c.attrs.point,l=t.slots.map(e=>{let t=h(e.bytes,Q.STORAGE|Q.COPY_DST|Q.COPY_SRC);if(e.init===`attr`){let n=r.require(e.name),i=e.bytes/4;if(n.type===`bool`){let e=new Uint32Array(i),r=n.data;for(let t=0;t<i;t++)e[t]=r[t];a.queue.writeBuffer(t,0,e)}else a.queue.writeBuffer(t,0,Tt(n.data.subarray(0,i)))}else if(e.init===`quat-default`){let n=new Float32Array(e.bytes/4);for(let e=3;e<n.length;e+=4)n[e]=1;a.queue.writeBuffer(t,0,n)}return t}),m=t.cols.map(e=>h(e,Q.STORAGE|Q.COPY_DST|Q.COPY_SRC)),v=t.instances===null?void 0:u(c,{defaultAssetId:t.instances.assetId,...t.instances.assetAttr===``?{}:{assetAttr:t.instances.assetAttr}}),y=t.instances!==null&&t.instances.permBytes>0?h(t.instances.permBytes,Q.STORAGE|Q.COPY_DST):void 0;y!==void 0&&v!==void 0&&a.queue.writeBuffer(y,0,v.perm);let b=Q.STORAGE|Q.COPY_DST|Q.COPY_SRC|Q.VERTEX,x=v===void 0?[]:Array.from(v.counts,e=>h(e*64,b)),S=v===void 0||t.instances===null||t.instances.colorBytes===0?[]:Array.from(v.counts,e=>h(e*Ft,b)),C=t.instances?.channels??[],w=v===void 0||C.length===0?[]:Array.from(v.counts,e=>C.map(t=>h(e*t.byteStride,b))),T=(e,t)=>{if(e.kind===`slot`)return l[e.index];if(e.kind===`col`)return m[e.index];if(e.kind===`colorOut`){let e=S[t];if(e===void 0)throw Error(`resident run: a kernel binds a retained instance-colour buffer but the plan declares no colour output (plan and kernels disagree)`);return e}if(e.kind===`channelOut`){let n=w[t]?.[e.index];if(n===void 0)throw Error(`resident run: a kernel binds retained per-instance channel ${e.index} but the plan declares no such channel (plan and kernels disagree)`);return n}if(e.kind===`perm`){if(y===void 0)throw Error(`resident run: a kernel binds the grouping permutation but the plan declares no per-point asset attribute (plan and kernels disagree)`);return y}let n=x[t];if(n===void 0)throw Error(`resident run: a kernel binds a retained instance-transform buffer but the plan declares no instances output (plan and kernels disagree)`);return n},E=a.createCommandEncoder(),D=E.beginComputePass(),O=performance.now();for(let n of t.members){p();for(let t of n.steps){let n=e.getPipeline(t.key,t.wgsl,t.entryPoint,i);D.setPipeline(n);let r=Pt(t.workgroupSize,e.maxElementsPerDispatch),o=t.perBatch&&v!==void 0?Array.from(v.counts,(e,t)=>({batch:t,elements:e,base:v.offsets[t]})):[{batch:0,elements:f,base:0}];for(let e of o){i!==void 0&&i.dispatches++;let o=new ArrayBuffer(t.uniformBytes),s=new Uint8Array(o),c=new Uint32Array(o,0,t.uniformBytes>=16?4:3);c[0]=e.elements,c[1]=t.seed>>>0,t.perBatch&&(c[3]=e.base),t.consts.length>0&&new Float32Array(o,16,t.consts.length).set(t.consts);let l=Math.ceil(e.elements/r);for(let i=0;i<l;i++){let o=h(t.uniformBytes,Q.UNIFORM|Q.COPY_DST);c[2]=i*r,a.queue.writeBuffer(o,0,s);let l=a.createBindGroup({layout:n.getBindGroupLayout(0),entries:[{binding:t.uniformsBinding,resource:{buffer:o}},...t.bindings.map(t=>({binding:t.binding,resource:{buffer:T(t.ref,e.batch)}}))]}),u=Math.min(r,e.elements-i*r);D.setBindGroup(0,l),D.dispatchWorkgroups(Math.ceil(u/t.workgroupSize))}}}d!==void 0&&performance.now()-O>d&&(await Gt(),p(),O=performance.now())}D.end();let te=[],k,A=t.materialize?t.written.reduce((e,n)=>e+t.slots[n.slot].bytes,0):0;if(A>0){k=h(A,Q.COPY_DST|Q.MAP_READ);let e=0;for(let n of t.written){let r=t.slots[n.slot].bytes;E.copyBufferToBuffer(l[n.slot],0,k,e,r),te.push(e),e+=r}}a.queue.submit([E.finish()]);let j;if(t.materialize){let e;if(k!==void 0){await k.mapAsync(Et.READ,0,A);try{e=k.getMappedRange(0,A).slice(0)}finally{k.unmap()}}p(),j=n(c);let r=j.attrs.point;for(let e of t.layoutOps)if(e.op===`replace`)r.replace(e.name,e.type,e.tupleSize);else{let e=r.get(`rot`);(!e||e.type!==`f32`||e.tupleSize!==4)&&(e&&r.remove(`rot`),r.add(`rot`,`f32`,4,[0,0,0,1]))}t.written.forEach((t,n)=>{let i=r.require(t.name),a=f*i.tupleSize;if(e===void 0)throw Error(`resident run: readback missing for a written attribute`);if(i.type===`bool`){let t=i.writable(),r=new Uint32Array(e,te[n],a);for(let e=0;e<a;e++)t[e]=r[e]}else{let r=Wt[i.type];if(r===void 0)throw Error(`resident run: cannot materialize attribute "${t.name}" of type ${i.type}`);i.writable().set(new r(e,te[n],a))}})}else p();let ne;if(t.instances!==null){let e=t.instances.colorBytes>0;if(v===void 0||x.length!==v.order.length||S.length!==(e?v.order.length:0)||w.length!==(C.length>0?v.order.length:0)||w.some(e=>e.length!==C.length))throw Error(`resident run: the plan declares an instances output but the acquired transform buffers do not match the grouping (library bug: plan.instances, the grouping, and the acquired buffers must agree)`);let n=(e,t,n)=>{let r=o.detach(e);g.add(e);try{return Mt(r,t,n)}catch(e){throw r.destroy(),e}},r=[];for(let t=0;t<v.order.length;t++){let i=v.order[t],a=v.counts[t],o=n(x[t],a*64,`${a} instances of "${i}"`);_.push(o);let c=Object.create(null);if(e){let e=n(S[t],a*Ft,`${a} instance colours of "${i}"`);_.push(e),c[ee]={handle:e,type:`f32`,itemSize:3}}C.forEach((e,r)=>{let o=n(w[t][r],a*e.byteStride,`${a} instance "${e.name}" values of "${i}"`);_.push(o),c[e.name]={handle:o,type:e.type,itemSize:e.itemSize}}),r.push(s(i,a,o,c))}ne=r}i!==void 0&&(i.residentRuns++,i.fusedNodes+=t.members.length,i.readbacksSaved+=t.members.length-+!!t.materialize);let re={};return j!==void 0&&(re.geo=j),ne!==void 0&&(re.deviceBatches=ne),re}catch(e){for(let e of _)e.dispose();throw e instanceof A?e:Error(`GpuFieldEvaluator: resident run failed (${t.members.length} fused nodes [${t.members.map(e=>`"${e.id}"`).join(`, `)}], ${f} points): ${e instanceof Error?e.message:String(e)}`,{cause:e})}finally{for(let e of m)g.has(e)||o.release(e)}}var qt=`gpu2`,Jt=268435456,Yt=[`spawnInstances`],Xt={f32:Float32Array,i32:Int32Array,u32:Uint32Array},Zt={f32:Float32Array,i32:Int32Array,u32:Uint32Array};function Qt(e){let t=e=>e!==void 0&&e!==``?e:`?`;return[qt,t(e?.vendor),t(e?.architecture),t(e?.device),t(e?.description)].join(`|`)}function $t(e,t){return e!==void 0&&(e.fallbacks[t]=(e.fallbacks[t]??0)+1),null}var en=class{cacheSalt;residentTerminals;acceptDerivedSpecs;deviceInstanceAttrs;device;kernels=new Map;pipelines=new Map;pool;maxElementsPerDispatch;maxResidentBytes;constructor(e,t={}){if(t.maxElementsPerDispatch!==void 0&&!Number.isFinite(t.maxElementsPerDispatch))throw Error(`GpuFieldEvaluator: maxElementsPerDispatch must be a finite number, got ${t.maxElementsPerDispatch}; leave it unset to use the device maximum`);if(t.deviceInstanceAttrs===!0&&t.deviceInstances!==!0)throw Error(`GpuFieldEvaluator: deviceInstanceAttrs requires deviceInstances: true — per-instance channels ride on a device-resident spawner terminal, and without deviceInstances no spawner is one, so the flag could never take effect. Pass both to produce channels on the device (and bind them yourself from batch.attributes[name].handle.resource), or drop deviceInstanceAttrs to let the CPU spawner produce transforms and channels together.`);this.device=e,this.cacheSalt=Qt(t.adapterInfo??e.adapterInfo),this.pool=new kt(e,t.maxPooledBytes??Jt),this.maxElementsPerDispatch=t.maxElementsPerDispatch,this.maxResidentBytes=t.maxResidentBytes??536870912,this.residentTerminals=t.deviceInstances===!0?Yt:[],this.deviceInstanceAttrs=t.deviceInstanceAttrs===!0,this.acceptDerivedSpecs=E(t)}get pipelineCacheSize(){return this.pipelines.size}get kernelCacheSize(){return this.kernels.size}get poolStats(){return this.pool.stats}dispose(){this.pool.dispose()}chunkElements(e){let t=Nt*e.workgroupSize,n=Math.min(this.maxElementsPerDispatch??t,t);return Math.max(e.workgroupSize,Math.floor(n/e.workgroupSize)*e.workgroupSize)}resolveField(e,t,n){let r=p(e,this.acceptDerivedSpecs);if(r===void 0)return $t(n,b(e));let i=t.geo.attrs[t.domain],a={},o=[];for(let e of i.names().sort()){let t=i.get(e);t!==void 0&&(a[e]={type:t.type,tupleSize:t.tupleSize},o.push(`${JSON.stringify(e)}:${t.type}x${t.tupleSize}`))}let s;try{s=pt(r,e.key)}catch{return $t(n,`compile-error`)}let c=`${s.length}#${s}|${o.join(`,`)}`,l=this.kernels.get(c);if(l===void 0){try{l=wt(r,{attributes:a})}catch(e){l=e instanceof Error?e:Error(String(e))}this.kernels.set(c,l)}if(l instanceof Error)return $t(n,`compile-error`);if(l.inputs.length+1>8)return $t(n,`too-many-buffers`);let u=vt(r,l,i);if(`problem`in u)return $t(n,`param-bindings`);let d=i.count;if(d===0)return Promise.resolve({data:new Zt[l.outType](0),tupleSize:l.outTupleSize});let f=this.getPipeline(l.key,l.wgsl,l.entryPoint,n);return n!==void 0&&n.dispatches++,this.dispatch(e,t,l,f,d,u.values)}getPipeline(e,t,n,r){let i=this.pipelines.get(e);if(i!==void 0)return r!==void 0&&r.pipelineCacheHits++,i;let a=this.device.createShaderModule({code:t}),o=this.device.createComputePipeline({layout:`auto`,compute:{module:a,entryPoint:n}});return this.pipelines.set(e,o),r!==void 0&&r.pipelinesCompiled++,o}planRun(e,t,n){let r=Ut(e,t,this.maxResidentBytes,this.acceptDerivedSpecs,{deviceInstanceAttrs:this.deviceInstanceAttrs});return`plan`in r?r.plan:(n!==void 0&&(n.fallbacks[r.reason]=(n.fallbacks[r.reason]??0)+1),null)}executeRun(e,t,n){let r=Lt(e);return r===null?Promise.reject(Error(`GpuFieldEvaluator.executeRun: plan was not produced by this library's planRun; pass the object returned by planRun on the same resolver`)):Kt({device:this.device,pool:this.pool,maxElementsPerDispatch:this.maxElementsPerDispatch,getPipeline:(e,t,n,r)=>this.getPipeline(e,t,n,r)},r,t,n)}async dispatch(e,t,n,r,i,a){let o=this.device,s=[],c=(e,t)=>{let n=this.pool.acquire(e,t);return s.push(n),n};try{let e=this.chunkElements(n),s=Math.ceil(i/e),l=[],u=t.geo.attrs[t.domain];for(let e of n.inputs){let t=u.require(e.name),n=i*e.tupleSize,r;if(t.type===`bool`){let e=new Uint32Array(n),i=t.data;for(let t=0;t<n;t++)e[t]=i[t];r=e}else r=Tt(t.data.subarray(0,n));let a=c(n*4,Q.STORAGE|Q.COPY_DST);o.queue.writeBuffer(a,0,r),l.push({binding:e.binding,resource:{buffer:a}})}let d=i*n.outTupleSize*4,f=c(d,Q.STORAGE|Q.COPY_SRC);l.push({binding:n.bindings.output,resource:{buffer:f}});let p=c(d,Q.COPY_DST|Q.MAP_READ),m=new ArrayBuffer(n.uniformBytes),h=new Uint8Array(m),g=new Uint32Array(m,0,3);g[0]=i,g[1]=t.seed>>>0,a.length>0&&new Float32Array(m,16,a.length).set(a);let _=[];for(let t=0;t<s;t++){let i=c(n.uniformBytes,Q.UNIFORM|Q.COPY_DST);g[2]=t*e,o.queue.writeBuffer(i,0,h),_.push(o.createBindGroup({layout:r.getBindGroupLayout(0),entries:[{binding:n.bindings.uniforms,resource:{buffer:i}},...l]}))}let v=o.createCommandEncoder(),y=v.beginComputePass();y.setPipeline(r);for(let t=0;t<s;t++){let r=Math.min(e,i-t*e);y.setBindGroup(0,_[t]),y.dispatchWorkgroups(Math.ceil(r/n.workgroupSize))}y.end(),v.copyBufferToBuffer(f,0,p,0,d),o.queue.submit([v.finish()]),await p.mapAsync(Et.READ,0,d);let b;try{b=p.getMappedRange(0,d).slice(0)}finally{p.unmap()}return{data:new Xt[n.outType](b),tupleSize:n.outTupleSize}}catch(n){throw Error(`GpuFieldEvaluator: dispatch failed for field ${e.key} (${i} elements on the ${t.domain} domain): ${n instanceof Error?n.message:String(n)}`,{cause:n})}finally{for(let e of s)this.pool.release(e)}}};export{en as t};