import{Bt as e,Ci as t,Cr as n,Di as r,Oi as i,Si as a,Ti as o,Tr as s,Xn as c,_i as l,ar as u,bi as d,ci as f,di as p,fi as m,fr as h,gi as g,gr as _,hi as v,ir as y,li as b,lr as x,mr as S,nr as C,or as w,pi as T,pr as E,rr as D,sr as O,ur as k,vi as ee,wi as A,xi as j,xr as M,yi as te}from"./wordmark-BKP1BD66.js";var N=class extends Error{constructor(e){super(e),this.name=`GpuCompileError`}};function P(e,t){let n=Math.fround(e);if(!Number.isFinite(n))throw new N(`${t}: value ${e} is not representable as a finite f32 (WGSL kernels compute in f32; keep magnitudes within ~3.4e38)`);return Object.is(n,-0)?`-0f`:`${String(n)}f`}function ne(e){return`${e>>>0}u`}function F(e){return`0x${(e>>>0).toString(16).padStart(8,`0`)}u`}var I=F,re=P(34028234663852886e22,`internal f32 max`);function ie(e,t){let n=I(e);for(let e of t)n=`pcg_hash_mix(${n}, ${e})`;return`pcg_hash_finalize(${n})`}function ae(){let e=[];for(let t=0;t<12;t++){let n=e=>P(h[t*3+e],`internal GRAD3`);e.push(`  vec3<f32>(${n(0)}, ${n(1)}, ${n(2)}),`)}return`var<private> PCG_GRAD3: array<vec3<f32>, 12> = array<vec3<f32>, 12>(
${e.join(`
`)}
);`}var L=e=>t=>P(t,e),oe=new Map([[`PCG_GRAD3`,{deps:[],text:ae()}],[`pcg_hash_mix`,{deps:[],text:`fn pcg_hash_mix(h_in: u32, value: u32) -> u32 {
  var k = value * ${I(d)};
  k = (k << 15u) | (k >> 17u);
  k = k * ${I(j)};
  var h = h_in ^ k;
  h = (h << 13u) | (h >> 19u);
  h = h * 5u + ${I(a)};
  return h;
}`}],[`pcg_hash_finalize`,{deps:[],text:`fn pcg_hash_finalize(h_in: u32) -> u32 {
  var h = h_in ^ (h_in >> 16u);
  h = h * ${I(l)};
  h = h ^ (h >> 13u);
  h = h * ${I(ee)};
  h = h ^ (h >> 16u);
  return h;
}`}],[`pcg_hash3`,{deps:[`pcg_hash_mix`,`pcg_hash_finalize`],text:`fn pcg_hash3(a: u32, b: u32, c: u32) -> u32 {
  return ${ie(A(3),[`a`,`b`,`c`])};
}`}],[`pcg_hash4`,{deps:[`pcg_hash_mix`,`pcg_hash_finalize`],text:`fn pcg_hash4(a: u32, b: u32, c: u32, d: u32) -> u32 {
  return ${ie(A(4),[`a`,`b`,`c`,`d`])};
}`}],[`pcg_hash5`,{deps:[`pcg_hash_mix`,`pcg_hash_finalize`],text:`fn pcg_hash5(a: u32, b: u32, c: u32, d: u32, e: u32) -> u32 {
  return ${ie(A(5),[`a`,`b`,`c`,`d`,`e`])};
}`}],[`pcg_hash_float`,{deps:[],text:`fn pcg_hash_float(h: u32) -> f32 {
  return f32(h >> 8u) * ${P(te,`internal hashFloat scale`)};
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
  return ${L(`internal PERLIN_SCALE`)(k)} * pcg_mix(
    pcg_mix(pcg_mix(n000, n100, u), pcg_mix(n010, n110, u), v),
    pcg_mix(pcg_mix(n001, n101, u), pcg_mix(n011, n111, u), v),
    w);
}`}],[`pcg_simplex_corner`,{deps:[`pcg_hash4`,`PCG_GRAD3`],text:`fn pcg_simplex_corner(seed: u32, i: i32, j: i32, k: i32, x: f32, y: f32, z: f32) -> f32 {
  let t = ${L(`internal simplex R2`)(w)} - x * x - y * y - z * z;
  if (t <= 0f) {
    return 0f;
  }
  let g = pcg_hash4(seed, bitcast<u32>(i), bitcast<u32>(j), bitcast<u32>(k)) % 12u;
  let t2 = t * t;
  return t2 * t2 * dot(PCG_GRAD3[g], vec3<f32>(x, y, z));
}`}],[`pcg_simplex_noise`,{deps:[`pcg_simplex_corner`],text:`fn pcg_simplex_noise(seed: u32, p: vec3<f32>) -> f32 {
  let s = (p.x + p.y + p.z) * ${L(`internal simplex F3`)(y)};
  let i = i32(floor(p.x + s));
  let j = i32(floor(p.y + s));
  let k = i32(floor(p.z + s));
  let t = f32(i + j + k) * ${L(`internal simplex G3`)(u)};
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
  let x1 = x0 - f32(i1) + ${L(`internal simplex G3`)(u)};
  let y1 = y0 - f32(j1) + ${L(`internal simplex G3`)(u)};
  let z1 = z0 - f32(k1) + ${L(`internal simplex G3`)(u)};
  let x2 = x0 - f32(i2) + ${L(`internal simplex 2*G3`)(2*u)};
  let y2 = y0 - f32(j2) + ${L(`internal simplex 2*G3`)(2*u)};
  let z2 = z0 - f32(k2) + ${L(`internal simplex 2*G3`)(2*u)};
  let x3 = x0 - 1f + ${L(`internal simplex 3*G3`)(3*u)};
  let y3 = y0 - 1f + ${L(`internal simplex 3*G3`)(3*u)};
  let z3 = z0 - 1f + ${L(`internal simplex 3*G3`)(3*u)};
  return ${L(`internal SIMPLEX_SCALE`)(72)} * (pcg_simplex_corner(seed, i, j, k, x0, y0, z0)
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
  var f1 = ${re};
  var f2 = ${re};
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
}`}]]);function se(e){let t=new Set,n=e=>{if(t.has(e))return;let r=oe.get(e);if(!r)throw Error(`internal: unknown WGSL library item "${e}"`);t.add(e);for(let e of r.deps)n(e)};for(let t of e)n(t);let r=[];for(let[e,n]of oe)t.has(e)&&r.push(n.text);return r}var ce=`apply2`;function le(e,t=!1){return e>0?16+e*16:t?16:12}var ue=[`x`,`y`,`z`,`w`];function R(e,t,n){if(t.kind===`const`)return fe(t,n);let r=pe(e,t,n);return t.type===`f32`?r:`f32(${r})`}function de(e,t,n){return t.kind===`const`?fe(t,n):pe(e,t,n)}function fe(e,t){let n=e.tupleSize===1?0:t;if(n>=4)throw Error(`apply codegen: constant slot ${e.slot} has no component ${n} (a uniform slot holds 4 f32 components)`);return`params.consts[${e.slot}].${ue[n]}`}function pe(e,t,n){return t.tupleSize===1?`${e}[i]`:n===0?`${e}[i * ${t.tupleSize}u]`:`${e}[i * ${t.tupleSize}u + ${n}u]`}function me(e,t,n){return t===1?`${e}[i]`:n===0?`${e}[i * ${t}u]`:`${e}[i * ${t}u + ${n}u]`}var z=class{items=[];add(e,t,n,r){return this.items.push({role:e,access:t,elem:n,comment:r}),`b${this.items.length}`}};function he(e){let t=0;for(let n of e)if(n.kind===`const`){if(n.slot<0||n.slot>=4)throw Error(`apply codegen: constant slot ${n.slot} is out of range; an apply kernel carries at most 4 uniform constant slots (raise MAX_APPLY_CONST_SLOTS in applyKernels.ts if a new node kind needs more)`);t=Math.max(t,n.slot+1)}return t}function B(e,t,n,r,i,a=!1){let o=[`@group(0) @binding(0) var<uniform> params: PcgParams;`],s=[];n.forEach((e,t)=>{let n=t+1,r=e.access===`read`?`read`:`read_write`;o.push(`@group(0) @binding(${n}) var<storage, ${r}> b${n}: array<${e.elem}>; // ${e.comment}`),s.push({binding:n,role:e.role,access:e.access})});let c=a?`
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
`,entryPoint:`main`,workgroupSize:64,bindings:s,constSlots:t,uniformBytes:le(t,a),key:`${ce}|${e}`}}var V=e=>e.kind===`column`?`${e.type}x${e.tupleSize}`:`constx${e.tupleSize}@${e.slot}`;function ge(e,t,n){let r=e.kind===`const`?`f32`:e.type,i=t===`f32`&&e.kind===`column`&&e.type===`f32`,a=i?`u32`:r,o=t===`bool`||i?`u32`:t,s=new z,c=e.kind===`column`?s.add(`value`,`read`,a,`value column ${V(e)}`):``,l=e.kind===`column`?{...e,type:a}:e,u=s.add(`target`,`read_write`,o,`target attribute ${t} tupleSize ${n}`),d=(e,n)=>{switch(t){case`f32`:return i?e:n;case`i32`:return r===`f32`?`i32(${e})`:r===`i32`?e:`bitcast<i32>(${e})`;case`u32`:return r===`f32`?`u32(${e})`:r===`u32`?e:`bitcast<u32>(${e})`;default:return`select(0u, 1u, ${e} != ${r===`f32`?`0f`:r===`i32`?`0i`:`0u`})`}},f=[];for(let e=0;e<n;e++){let t=de(c,l,e);f.push(`  ${me(u,n,e)} = ${d(t,R(c,l,e))};`)}return B(`setAttribute|val=${V(e)}|out=${t}x${n}`,he([e]),s.items,[],f.join(`
`))}var _e={euler:`fn pcg_quat_from_euler_deg(r: vec3<f32>) -> vec4<f32> {
  let h = r * ${P(Math.PI/360,`internal PI/360`)};
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
}`};function ve(e,t,n,r,i){let a=new z,o=e.kind===`column`?a.add(`translate`,`read`,e.type,`translate column ${V(e)}`):``,s=t.kind===`column`?a.add(`rotateEuler`,`read`,t.type,`rotateEuler column ${V(t)}`):``,c=n.kind===`column`?a.add(`scale`,`read`,n.type,`scale column ${V(n)}`):``,l=a.add(`P`,`read_write`,`f32`,`attribute P: f32 tupleSize 3`),u=r?a.add(`rot`,`read_write`,`f32`,`attribute rot: f32 tupleSize 4`):``,d=i?a.add(`scaleAttr`,`read_write`,`f32`,`attribute scale: f32 tupleSize 3`):``,f=[];return f.push(`  let s = vec3<f32>(${[0,1,2].map(e=>R(c,n,e)).join(`, `)});`),f.push(`  let q = pcg_quat_from_euler_deg(vec3<f32>(${[0,1,2].map(e=>R(s,t,e)).join(`, `)}));`),f.push(`  let v = pcg_rotate_vec(q, vec3<f32>(${l}[i * 3u] * s.x, ${l}[i * 3u + 1u] * s.y, ${l}[i * 3u + 2u] * s.z));`),f.push(`  ${l}[i * 3u] = v.x + ${R(o,e,0)};`),f.push(`  ${l}[i * 3u + 1u] = v.y + ${R(o,e,1)};`),f.push(`  ${l}[i * 3u + 2u] = v.z + ${R(o,e,2)};`),r&&(f.push(`  let q2 = pcg_quat_mul(q, vec4<f32>(${u}[i * 4u], ${u}[i * 4u + 1u], ${u}[i * 4u + 2u], ${u}[i * 4u + 3u]));`),f.push(`  ${u}[i * 4u] = q2.x;`),f.push(`  ${u}[i * 4u + 1u] = q2.y;`),f.push(`  ${u}[i * 4u + 2u] = q2.z;`),f.push(`  ${u}[i * 4u + 3u] = q2.w;`)),i&&(f.push(`  ${d}[i * 3u] = ${d}[i * 3u] * s.x;`),f.push(`  ${d}[i * 3u + 1u] = ${d}[i * 3u + 1u] * s.y;`),f.push(`  ${d}[i * 3u + 2u] = ${d}[i * 3u + 2u] * s.z;`)),B(`transformPoints|t=${V(e)}|r=${V(t)}|s=${V(n)}|rot=${+!!r}|scl=${+!!i}`,he([e,t,n]),a.items,[_e.euler,_e.mul,_e.rotate],f.join(`
`))}function ye(e,t){let n=new z,r=e.kind===`column`?n.add(`amount`,`read`,e.type,`amount column ${V(e)}`):``,i=t?n.add(`seed`,`read`,`u32`,`attribute seed: u32 tupleSize 1`):``,a=n.add(`P`,`read_write`,`f32`,`attribute P: f32 tupleSize 3`),o=[];o.push(`  let ident = pcg_hash4(bitcast<u32>(${a}[i * 3u]), bitcast<u32>(${a}[i * 3u + 1u]), bitcast<u32>(${a}[i * 3u + 2u]), ${t?`${i}[i]`:`0u`});`);for(let t=0;t<3;t++){let n=t===0?`i * 3u`:`i * 3u + ${t}u`;o.push(`  ${a}[${n}] = ${a}[${n}] + (pcg_hash_float(pcg_hash3(params.seed, ident, ${t}u)) * 2f - 1f) * ${R(r,e,t)};`)}return B(`jitterPoints|a=${V(e)}|s=${+!!t}`,he([e]),n.items,se([`pcg_hash3`,`pcg_hash4`,`pcg_hash_float`]),o.join(`
`))}var be={"+x":`f, u, -r`,"-x":`-f, u, r`,"+y":`-r, f, u`,"-y":`r, -f, u`,"+z":`r, u, f`,"-z":`-r, u, -f`};function xe(e,t,n){let r=new z,i=e.kind===`column`?r.add(`direction`,`read`,e.type,`direction column ${V(e)}`):``,a=r.add(`rot`,`read_write`,`f32`,`attribute rot: f32 tupleSize 4`),o=P(1e-12,`internal ORIENT_PARALLEL_EPS`),s=`  let d = vec3<f32>(${[0,1,2].map(t=>R(i,e,t)).join(`, `)});
  let dl = dot(d, d);
  if (dl == 0f) {
    return; // zero direction: keep the prior rot
  }
  let f = d * (1f / sqrt(dl));
  let up = vec3<f32>(${[0,1,2].map(e=>R(``,n,e)).join(`, `)});
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
  let q = pcg_quat_from_basis(${be[t]});
  ${a}[i * 4u] = q.x;
  ${a}[i * 4u + 1u] = q.y;
  ${a}[i * 4u + 2u] = q.z;
  ${a}[i * 4u + 3u] = q.w;`;return B(`orientAlongVector|d=${V(e)}|axis=${t}|up=${V(n)}`,he([e,n]),r.items,[_e.basis],s)}function Se(e,t,n=!1,r=0){let i=r>0;if(i&&r<3)throw Error(`apply codegen: spawnInstances colour source has tupleSize ${r}; components 0-2 are read as RGB, so it must be at least 3 (the planner rejects narrower columns before reaching codegen)`);let a=new z,o=a.add(`P`,`read`,`f32`,`attribute P: f32 tupleSize 3`),s=e?a.add(`rot`,`read`,`f32`,`attribute rot: f32 tupleSize 4`):``,c=t?a.add(`scaleAttr`,`read`,`f32`,`attribute scale: f32 tupleSize 3`):``,l=a.add(`transforms`,`read_write`,`f32`,`out: 16 f32 per instance`),u=n?a.add(`perm`,`read`,`u32`,`grouping permutation: source point index per slot`):``,d=i?a.add(`color`,`read`,`f32`,`colour source: f32 tupleSize ${r}`):``,f=i?a.add(`colors`,`read_write`,`f32`,`out: 4 f32 per instance (vec3 storage stride, [3] = 0 pad)`):``,p=n?`src`:`i`,m=e?`vec4<f32>(${s}[${p} * 4u], ${s}[${p} * 4u + 1u], ${s}[${p} * 4u + 2u], ${s}[${p} * 4u + 3u])`:`vec4<f32>(0f, 0f, 0f, 1f)`,h=t?`vec3<f32>(${c}[${p} * 3u], ${c}[${p} * 3u + 1u], ${c}[${p} * 3u + 2u])`:`vec3<f32>(1f, 1f, 1f)`,g=`${n?`  let src = ${u}[params.base + i];\n`:``}  let q = ${m};
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
  ${f}[co + 3u] = 0f;`:``}`;return B(`spawnInstances|rot=${+!!e}|scl=${+!!t}${n?`|perm`:``}${i?`|color=${r}`:``}`,0,a.items,[],g,n)}function Ce(e,t,n=!1){if(!Number.isInteger(e)||e<1||e>4)throw Error(`apply codegen: per-instance channel itemSize ${e} is out of range; a channel binds as a WGSL storage array of a scalar or a vec2/vec3/vec4, so it must be a whole number in 1..4 (the planner rejects wider columns before reaching codegen)`);let r=e===3?4:e;if(t!==r)throw Error(`apply codegen: per-instance channel of itemSize ${e} spends ${r} slots per instance, not ${t}; pass the \`components\` deviceInstanceAttributeLayout returns rather than a second reading of the vec3 padding rule`);let i=new z,a=i.add(`src`,`read`,`u32`,`channel source: ${e} word(s) per point`),o=i.add(`out`,`read_write`,`u32`,`out: ${t} word(s) per instance${t===e?``:` (vec3 storage stride, [3] = 0 pad)`}`),s=n?i.add(`perm`,`read`,`u32`,`grouping permutation: source point index per slot`):``,c=n?`src`:`i`,l=t=>e===1?`${a}[${c}]`:t===0?`${a}[s]`:`${a}[s + ${t}u]`,u=e=>t===1?`${o}[i]`:e===0?`${o}[o]`:`${o}[o + ${e}u]`,d=[];n&&d.push(`  let src = ${s}[params.base + i];`),e>1&&d.push(`  let s = ${c} * ${e}u;`),t>1&&d.push(`  let o = i * ${t}u;`);for(let t=0;t<e;t++)d.push(`  ${u(t)} = ${l(t)};`);for(let n=e;n<t;n++)d.push(`  ${u(n)} = 0u;`);return B(`instanceChannel|ts=${e}|c=${t}${n?`|perm`:``}`,0,i.items,[],d.join(`
`),n)}var we=64,Te=`wgsl2`,Ee=[`x`,`y`,`z`,`w`];function H(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function De(e,t,n){return new N(`${e}: ${t} has tupleSize ${n}, but GPU kernels support tuple sizes 1 to 4; evaluate this field on the CPU instead, or split it into components`)}function U(e,t,n){let r=1;for(let i of n)if(i!==1){if(r!==1&&r!==i)throw new N(`${t}: ${e}: incompatible tuple sizes ${r} and ${i}`);r=i}return r}var Oe=class{layout;params;lines=[];libRoots=new Set;usesSeed=!1;valueNumbers=new Map;bindings=new Map;helpers=new Map;helperTexts=[];helperCounters=new Map;varCounter=0;constructor(e,t,n){this.layout=e,this.params=n,t.forEach((t,n)=>{this.bindings.set(t,{name:t,varName:`in${n}`,binding:n+1,attr:e.attributes[t]})})}paramSlot(e){let t=this.params.slots.get(e);if(t===void 0)throw Error(`internal: param ${JSON.stringify(e)} was not pre-planned`);return{slot:t,arity:this.params.arities[t]}}attrIsSlot(e,t){let n=this.params.attrIsSlots.get(nt(e,t));if(n===void 0)throw Error(`internal: attributeIs ${nt(e,t)} was not pre-planned`);return n}emit(e,t){let n=this.valueNumbers.get(e);if(n)return n;let r={ref:`v${this.varCounter++}`,size:t};return this.lines.push(`  let ${r.ref} = ${e};`),this.valueNumbers.set(e,r),r}binding(e){let t=this.bindings.get(e);if(!t)throw Error(`internal: attribute ${JSON.stringify(e)} was not pre-bound`);return t}boundAttrs(){return[...this.bindings.values()]}helper(e,t){let n=this.helpers.get(t);if(n)return n;let r=this.helperCounters.get(e)??0;this.helperCounters.set(e,r+1);let i=`pcg_${e}_${r}`;return this.helpers.set(t,i),this.helperTexts.push(t.replaceAll(`@NAME@`,i)),i}helperBlocks(){return this.helperTexts}};function W(e,t){return e.size===t?e.ref:`vec${t}<f32>(${e.ref})`}function G(e){return e===1?`0f`:`vec${e}<f32>(0f)`}function K(e){return e===1?`1f`:`vec${e}<f32>(1f)`}function ke(e,t){return e===1?t:`vec${e}<f32>(${t})`}function Ae(e){let t=Object.keys(e.attributes).sort();return t.length===0?`the layout declares no attributes`:`layout attributes: ${t.map(e=>JSON.stringify(e)).join(`, `)}`}function je(e,t,n,r,i){let a=e.layout.attributes;if(!Object.hasOwn(a,n))throw new N(`${t}: ${i}attribute ${JSON.stringify(n)} is not in the kernel layout; ${Ae(e.layout)}`);let o=a[n];if(o.type===`string`)throw new N(`${t}: ${i}attribute ${JSON.stringify(n)} has type "string"; a string column has no numeric value to read — test it with { fn: "attributeIs", name: ${JSON.stringify(n)}, value: "..." }, which is 1 where it matches and 0 elsewhere, or select on it with { fn: "byAttribute", name: ${JSON.stringify(n)}, cases: {...}, default: ... }, or read a numeric or bool attribute`);if(r!==void 0&&o.tupleSize!==r)throw new N(`${t}: ${i}attribute ${JSON.stringify(n)}: expected tupleSize ${r}, got ${o.tupleSize} in the kernel layout`);if(o.tupleSize>4)throw De(t,`${i}attribute ${JSON.stringify(n)}`,o.tupleSize);return o}function Me(e,t,n,r,i){let a=je(e,t,n,r,i),o=e.binding(n),s=a.tupleSize,c=e=>a.type===`f32`?e:`f32(${e})`;if(s===1)return e.emit(c(`${o.varName}[i]`),1);let l=[];for(let e=0;e<s;e++)l.push(c(`${o.varName}[${q(s,e)}]`));return e.emit(`vec${s}<f32>(${l.join(`, `)})`,s)}function q(e,t){return e===1?`i`:t===0?`i * ${e}u`:`i * ${e}u + ${t}u`}var J=new Map;function Ne(){return[...J.keys()].sort()}var Pe=new Set([`worleyFeature`]);function Fe(){return Ne().filter(e=>!Pe.has(e))}function Ie(e,t,n){let r=String(e.fn),i=J.get(r);if(!i)throw new N(`${t}: field fn "${r}" is not supported by the WGSL compiler; supported fns: ${Fe().join(`, `)}`);return i(e,t,n)}function Y(e,t,n){return typeof e==`number`?n.emit(P(e,t),1):Array.isArray(e)?Le(e,t,n):Ie(e,t,n)}function Le(e,t,n){let r=e.length;if(r>4)throw De(t,`constant`,r);if(r===1)return n.emit(P(e[0],t),1);let i=e.map(e=>P(e,t));return n.emit(`vec${r}<f32>(${i.join(`, `)})`,r)}function X(e){return e.args}J.set(`constant`,(e,t,n)=>{let r=e.value;return typeof r==`number`?n.emit(P(r,`${t}.value`),1):Le(r,`${t}.value`,n)}),J.set(`attribute`,(e,t,n)=>{let r=e.name,i=e.tupleSize;return Me(n,t,r,i,``)});function Re(e,t,n,r,i){let a=e.layout.attributes;if(!Object.hasOwn(a,n))throw new N(`${t}: ${r}: attribute ${JSON.stringify(n)} is not in the kernel layout; ${Ae(e.layout)}`);let o=a[n];if(o.type!==`string`)throw new N(`${t}: ${r}: attribute ${JSON.stringify(n)} has type ${JSON.stringify(o.type)}, but ${r} ${i} a string attribute; compare a numeric attribute with { fn: "eq", args: [{ fn: "attribute", name: ${JSON.stringify(n)} }, <number>] }`);return o}J.set(`attributeIs`,(e,t,n)=>{let r=e.name,i=e.value,a=Re(n,t,r,`attributeIs`,`tests`),o=n.binding(r),s=n.attrIsSlot(r,i);return n.emit(`select(0f, 1f, f32(${o.varName}[${q(a.tupleSize,0)}]) == params.consts[${s}].x)`,1)}),J.set(`byAttribute`,(e,t,n)=>{let r=e.name,i=e.cases,a=Re(n,t,r,`byAttribute`,`selects on`),o=n.binding(r),s=Object.keys(i).sort(),c=s.map(e=>Y(i[e],`${t}.cases[${JSON.stringify(e)}]`,n)),l=Y(e.default,`${t}.default`,n),u=U(`byAttribute`,t,[...c.map(e=>e.size),l.size]),d=n.emit(`f32(${o.varName}[${q(a.tupleSize,0)}])`,1),f=W(l,u);return s.forEach((e,t)=>{let i=n.attrIsSlot(r,e);f=`select(${f}, ${W(c[t],u)}, ${d.ref} == params.consts[${i}].x)`}),n.emit(f,u)}),J.set(`position`,(e,t,n)=>Me(n,t,`P`,3,`position reads `)),J.set(`param`,(e,t,n)=>{let r=e.name,i=m(e);if(i!==void 0)return Ie(i,`${t}<${r}>`,n);let{slot:a,arity:o}=n.paramSlot(r),s=e=>`params.consts[${a}].${Ee[e]}`;return o===1?n.emit(s(0),1):n.emit(`vec${o}<f32>(${Array.from({length:o},(e,t)=>s(t)).join(`, `)})`,o)}),J.set(`index`,(e,t,n)=>n.emit(`f32(i)`,1)),J.set(`fraction`,(e,t,n)=>n.emit(`f32(i) / f32(max(params.count, 2u) - 1u)`,1)),J.set(`nodeSeed`,(e,t,n)=>(n.usesSeed=!0,n.emit(`f32(params.seed >> 8u) * 256.0 + f32(params.seed & 0xFFu)`,1))),J.set(`randomField`,(e,t,n)=>{let r=e.key,i=typeof r==`string`?o(r):(r??0)>>>0;n.usesSeed=!0,n.libRoots.add(`pcg_hash3`),n.libRoots.add(`pcg_hash4`),n.libRoots.add(`pcg_hash_float`);let a=`randomField's per-point identity reads `,s=je(n,t,`P`,void 0,a);if(s.tupleSize<3)throw new N(`${t}: ${a}attribute "P" with x, y and z (tupleSize 3), got tupleSize ${s.tupleSize}`);let c=n.binding(`P`).varName,l=e=>{let t=`${c}[${q(s.tupleSize,e)}]`;return s.type===`f32`?`bitcast<u32>(${t})`:`bitcast<u32>(f32(${t}))`},u=`0u`,d=Object.hasOwn(n.layout.attributes,`seed`)?n.layout.attributes.seed:void 0;if(d!==void 0){if(d.tupleSize!==1||d.type!==`u32`&&d.type!==`i32`)throw new N(`${t}: ${a}the standard point attribute "seed" as a u32 or i32 scalar, but the layout has it as ${d.type}x${d.tupleSize}; this field resolves on the CPU instead`);let e=n.binding(`seed`).varName;u=d.type===`u32`?`${e}[i]`:`bitcast<u32>(${e}[i])`}let f=`pcg_hash4(${l(0)}, ${l(1)}, ${l(2)}, ${u})`;return n.emit(`pcg_hash_float(pcg_hash3(params.seed, ${F(i)}, ${f}))`,1)}),J.set(`randomFrom`,(e,t,n)=>{let r=e.key,i=typeof r==`string`?o(r):(r??0)>>>0,a=Y(X(e)[0],`${t}.args[0]`,n);if(a.size!==1)throw new N(`${t}: randomFrom's key must be ONE number per element, got width ${a.size}; reduce it first, e.g. component(<expr>, 0)`);return n.usesSeed=!0,n.libRoots.add(`pcg_hash3`),n.libRoots.add(`pcg_hash_float`),n.emit(`pcg_hash_float(pcg_hash3(params.seed, ${F(i)}, bitcast<u32>(${W(a,1)})))`,1)});function Z(e,t,n){J.set(e,(r,i,a)=>{let o=X(r),s=[];for(let e=0;e<t;e++)s.push(Y(o[e],`${i}.args[${e}]`,a));let c=U(e,i,s.map(e=>e.size)),l=s.map(e=>W(e,c));return a.emit(n(l,c),c)})}Z(`add`,2,e=>`${e[0]} + ${e[1]}`),Z(`sub`,2,e=>`${e[0]} - ${e[1]}`),Z(`mul`,2,e=>`${e[0]} * ${e[1]}`),Z(`div`,2,e=>`${e[0]} / ${e[1]}`),Z(`min`,2,e=>`min(${e[0]}, ${e[1]})`),Z(`max`,2,e=>`max(${e[0]}, ${e[1]})`),Z(`abs`,1,e=>`abs(${e[0]})`),Z(`floor`,1,e=>`floor(${e[0]})`),Z(`trunc`,1,e=>`trunc(${e[0]})`),Z(`fract`,1,e=>`${e[0]} - floor(${e[0]})`),Z(`mod`,2,e=>`${e[0]} - ${e[1]} * floor(${e[0]} / ${e[1]})`),Z(`rem`,2,e=>`${e[0]} - ${e[1]} * trunc(${e[0]} / ${e[1]})`),Z(`sign`,1,(e,t)=>`select(${G(t)}, ${K(t)}, ${e[0]} > ${G(t)}) - select(${G(t)}, ${K(t)}, ${e[0]} < ${G(t)})`),Z(`sin`,1,e=>`sin(${e[0]})`),Z(`cos`,1,e=>`cos(${e[0]})`),Z(`tan`,1,e=>`tan(${e[0]})`),Z(`asin`,1,e=>`asin(${e[0]})`),Z(`acos`,1,e=>`acos(${e[0]})`),Z(`atan`,1,e=>`atan(${e[0]})`),Z(`atan2`,2,e=>`atan2(${e[0]}, ${e[1]})`),Z(`sqrt`,1,e=>`sqrt(${e[0]})`),Z(`pow`,2,e=>`pow(${e[0]}, ${e[1]})`),Z(`exp`,1,e=>`exp(${e[0]})`),Z(`exp2`,1,e=>`exp2(${e[0]})`),Z(`log`,1,e=>`log(${e[0]})`),Z(`log2`,1,e=>`log2(${e[0]})`),Z(`clamp`,3,e=>`clamp(${e[0]}, ${e[1]}, ${e[2]})`),Z(`lerp`,3,e=>`${e[0]} + (${e[1]} - ${e[0]}) * ${e[2]}`),Z(`select`,3,(e,t)=>`select(${e[2]}, ${e[1]}, ${e[0]} != ${G(t)})`),Z(`lt`,2,(e,t)=>`select(${G(t)}, ${K(t)}, ${e[0]} < ${e[1]})`),Z(`le`,2,(e,t)=>`select(${G(t)}, ${K(t)}, ${e[0]} <= ${e[1]})`),Z(`gt`,2,(e,t)=>`select(${G(t)}, ${K(t)}, ${e[0]} > ${e[1]})`),Z(`ge`,2,(e,t)=>`select(${G(t)}, ${K(t)}, ${e[0]} >= ${e[1]})`),Z(`eq`,2,(e,t)=>`select(${G(t)}, ${K(t)}, ${e[0]} == ${e[1]})`),Z(`ne`,2,(e,t)=>`select(${G(t)}, ${K(t)}, ${e[0]} != ${e[1]})`),Z(`step`,2,(e,t)=>`select(${G(t)}, ${K(t)}, ${e[1]} >= ${e[0]})`),J.set(`remap`,(e,t,n)=>{let r=X(e).map((e,r)=>Y(e,`${t}.args[${r}]`,n)),i=U(`remap`,t,r.map(e=>e.size)),[a,o,s,c,l]=r.map(e=>W(e,i)),u=n.emit(`${s} - ${o}`,i),d=G(i),f=n.emit(`select(${u.ref}, ${K(i)}, ${u.ref} == ${d})`,i);return n.emit(`select(${c} + ((${a} - ${o}) / ${f.ref}) * (${l} - ${c}), ${c}, ${u.ref} == ${d})`,i)}),J.set(`dot`,(e,t,n)=>{let r=X(e),i=Y(r[0],`${t}.args[0]`,n),a=Y(r[1],`${t}.args[1]`,n),o=U(`dot`,t,[i.size,a.size]);return o===1?n.emit(`${i.ref} * ${a.ref}`,1):n.emit(`dot(${W(i,o)}, ${W(a,o)})`,1)}),J.set(`cross`,(e,t,n)=>{let r=X(e),i=Y(r[0],`${t}.args[0]`,n),a=Y(r[1],`${t}.args[1]`,n);for(let[e,n]of[[`a`,i],[`b`,a]])if(n.size!==3)throw new N(`${t}: cross: argument \`${e}\` has width ${n.size}, but a cross product is defined for width 3 only. Scalars do NOT broadcast into one here — build a vec3 with \`vec(x, y, z)\`, or use \`dot\` for a product that works at any width.`);return n.emit(`cross(${i.ref}, ${a.ref})`,3)}),J.set(`smoothstep`,(e,t,n)=>{let r=X(e).map((e,r)=>Y(e,`${t}.args[${r}]`,n)),i=U(`smoothstep`,t,r.map(e=>e.size)),[a,o,s]=r.map(e=>W(e,i)),c=G(i),l=K(i),u=n.emit(`select(${c}, ${l}, ${a} == ${o})`,i),d=n.emit(`${o} - ${a}`,i),f=n.emit(`select(${d.ref}, ${l}, ${u.ref} != ${c})`,i),p=n.emit(`clamp((${s} - ${a}) / ${f.ref}, ${c}, ${l})`,i),m=n.emit(`(${p.ref} * ${p.ref}) * (${ke(i,`3f`)} - ${ke(i,`2f`)} * ${p.ref})`,i);return n.emit(`select(${m.ref}, select(${c}, ${l}, ${s} >= ${a}), ${u.ref} != ${c})`,i)}),J.set(`distance`,(e,t,n)=>{let r=X(e),i=Y(r[0],`${t}.args[0]`,n),a=Y(r[1],`${t}.args[1]`,n),o=U(`distance`,t,[i.size,a.size]),s=n.emit(`${W(i,o)} - ${W(a,o)}`,o);if(o===1)return n.emit(`abs(${s.ref})`,1);let c=n.emit(`dot(${s.ref}, ${s.ref})`,1);return n.emit(`sqrt(${c.ref})`,1)}),J.set(`length`,(e,t,n)=>{let r=Y(X(e)[0],`${t}.args[0]`,n);if(r.size===1)return n.emit(`abs(${r.ref})`,1);let i=n.emit(`dot(${r.ref}, ${r.ref})`,1);return n.emit(`sqrt(${i.ref})`,1)}),J.set(`normalize`,(e,t,n)=>{let r=Y(X(e)[0],`${t}.args[0]`,n),i=r.size===1?n.emit(`${r.ref} * ${r.ref}`,1):n.emit(`dot(${r.ref}, ${r.ref})`,1),a=n.emit(`select(0f, 1f / sqrt(${i.ref}), ${i.ref} > 0f)`,1);return n.emit(`${r.ref} * ${a.ref}`,r.size)}),J.set(`vec`,(e,t,n)=>{let r=X(e).map((e,r)=>Y(e,`${t}.args[${r}]`,n)),i=r.reduce((e,t)=>e+t.size,0);if(i>4)throw De(t,`vec result`,i);return r.length===1?r[0]:n.emit(`vec${i}<f32>(${r.map(e=>e.ref).join(`, `)})`,i)}),J.set(`component`,(e,t,n)=>{let r=Y(X(e)[0],`${t}.args[0]`,n),i=e.index;if(i>=r.size)throw new N(`${t}: component: index ${i} out of range for tupleSize ${r.size}`);return r.size===1?r:n.emit(`${r.ref}.${Ee[i]}`,1)}),J.set(`ramp`,(e,t,n)=>{let r=Y(X(e)[0],`${t}.args[0]`,n);if(r.size!==1)throw new N(`${t}: ramp: input must be scalar, got tupleSize ${r.size}`);let i=e.stops,a=n.helper(`ramp`,Be(i,`${t}.stops`));return n.emit(`${a}(${r.ref})`,1)}),J.set(`lookup`,(e,t,n)=>{let r=Y(X(e)[0],`${t}.args[0]`,n);if(r.size!==1)throw new N(`${t}: lookup: input must be scalar, got tupleSize ${r.size}`);let i=e.table,a=n.helper(`lookup`,ze(i,`${t}.table`));return n.emit(`${a}(${r.ref})`,1)});function ze(e,t){let n=e=>P(e,t),r=[`fn @NAME@(t: f32) -> f32 {`];for(let t=e.length-1;t>=1;t--)r.push(`  if (t >= ${n(t-.5)}) {`),r.push(`    return ${n(e[t])};`),r.push(`  }`);return r.push(`  return ${n(e[0])};`),r.push(`}`),r.join(`
`)}function Be(e,t){let n=e=>P(e,t),r=e.length-1,i=[];i.push(`fn @NAME@(t: f32) -> f32 {`),i.push(`  if (t <= ${n(e[0][0])}) {`),i.push(`    return ${n(e[0][1])};`),i.push(`  }`),i.push(`  if (t >= ${n(e[r][0])}) {`),i.push(`    return ${n(e[r][1])};`),i.push(`  }`);let a=t=>{let r=e[t-1][0],i=e[t-1][1],a=e[t][0]-r,o=e[t][1]-i;return`${n(i)} + ${n(o)} * ((t - ${n(r)}) / ${n(a)})`};for(let t=1;t<r;t++)i.push(`  if (t <= ${n(e[t][0])}) {`),i.push(`    return ${a(t)};`),i.push(`  }`);return r>=1?i.push(`  return ${a(r)};`):i.push(`  return t;`),i.push(`}`),i.join(`
`)}var Ve={valueNoise:D,perlinNoise:x,simplexNoise:O,worleyNoise:C},He={valueNoise:`pcg_value_noise`,perlinNoise:`pcg_perlin_noise`,simplexNoise:`pcg_simplex_noise`};function Ue(e){return e.opts??{}}function We(e,t,n,r){let i=Ue(t),a=i.position===void 0?n:`${n}.opts.position`,o=i.position===void 0?Me(r,n,`P`,3,`${e} position reads `):Y(i.position,a,r);if(o.size!==3)throw new N(`${a}: ${e}: position field must have tupleSize 3, got ${o.size}`);let s=P(i.frequency??1,`${n}.opts.frequency`),[c,l,u]=i.offset??[0,0,0],d=`vec3<f32>(${P(c,`${n}.opts.offset`)}, ${P(l,`${n}.opts.offset`)}, ${P(u,`${n}.opts.offset`)})`;return r.emit(`${o.ref} * ${s} + ${d}`,3)}function Ge(e){return e.libRoots.add(`pcg_hash_mix`),e.libRoots.add(`pcg_hash_finalize`),e.helper(`hash2`,`fn @NAME@(a: u32, b: u32) -> u32 {
  return pcg_hash_finalize(pcg_hash_mix(pcg_hash_mix(${F(A(2))}, a), b));
}`)}function Ke(e){return typeof e==`object`&&!!e}function qe(e,t,n){if(e===void 0)return`0u`;if(typeof e==`number`)return ne(e);let r=e.name;if(typeof r!=`string`||r===``)throw new N(`${t}.opts.seed.variant: param requires a non-empty string name`);if(m(e)!==void 0)throw new N(`${t}.opts.seed.variant: param ${JSON.stringify(r)} is bound to a Field, and a seed is resolved in u32 integer math with no per-element form; bind an integer, or evaluate this field on the CPU`);let{slot:i}=n.paramSlot(r);return`u32(params.consts[${i}].x)`}function Je(e,t,n){return Ke(e)?(n.usesSeed=!0,{expr:`${Ge(n)}(params.seed, ${qe(e.variant,t,n)})`}):{literal:(e??0)>>>0}}function Ye(e,t,n){let r=Ve[e];return`literal`in t?F(S(r,t.literal)):`${Ge(n)}(${F(r)}, ${t.expr})`}function Xe(e,t,n,r){let[i,a]=n,o=a-i;return e.emit(`(${t.ref} - ${P(i,r)}) / ${P(o,r)}`,1)}for(let e of[`valueNoise`,`perlinNoise`,`simplexNoise`])J.set(e,(t,n,r)=>{let i=Ue(t),a=Ye(e,Je(i.seed,n,r),r),o=We(e,t,n,r);r.libRoots.add(He[e]);let s=r.emit(`${He[e]}(${a}, ${o.ref})`,1);return i.normalized===!0?Xe(r,s,E[e],`${n}.opts.normalized`):s});J.set(`worleyNoise`,(e,t,n)=>{let r=Ue(e),i=r.output??`f1`;if(i!==`f1`&&i!==`f2`&&i!==`f2-f1`)throw new N(`${t}.opts.output: worleyNoise output "${i}" is not supported by the WGSL compiler; lowerable outputs: "f1", "f2", "f2-f1". This spec resolves on the CPU instead (a "compile-error" fallback), which is byte-identical, not an approximation.`);let a=r.exact===!0,o=Ye(`worleyNoise`,Je(r.seed,t,n),n),s=We(`worleyNoise`,e,t,n);n.libRoots.add(`pcg_worley`);let c=i!==`f1`,l=n.emit(`pcg_worley(${o}, ${s.ref}, ${a}, ${c})`,2),u=i===`f1`?n.emit(`${l.ref}.x`,1):i===`f2`?n.emit(`${l.ref}.y`,1):n.emit(`${l.ref}.y - ${l.ref}.x`,1);return r.normalized===!0?Xe(n,u,E.worleyNoise[i],`${t}.opts.normalized`):u}),J.set(`worleyFeature`,(e,t)=>{throw new N(`${t}: worleyFeature is not supported by the WGSL compiler. It reports WHICH feature point won a comparison, and a comparison that rounds the other way in f32 moves the answer to a different cell rather than by an ulp, which no tolerance can bound — the same reason worleyNoise refuses its "cell" output. This spec resolves on the CPU instead (a "compile-error" fallback), which is byte-identical, not an approximation.`)});function Ze(e){return e===`worleyNoise`?E.worleyNoise.f1:E[e]}function Qe(e,t,n){return e===`worleyNoise`?`pcg_worley(${t}, ${n}, false, false).x`:`${He[e]}(${t}, ${n})`}J.set(`fbm`,(e,n,r)=>{let i=e.base,a=Ue(e),o=a.octaves??4,s=a.lacunarity??2,c=a.gain??.5,l=a.frequency??1,[u,d,f]=a.offset??[0,0,0],p=Je(a.seed,n,r),m=a.position===void 0?n:`${n}.opts.position`,h=a.position===void 0?Me(r,n,`P`,3,`fbm position reads `):Y(a.position,m,r);if(h.size!==3)throw new N(`${m}: fbm: position field must have tupleSize 3, got ${h.size}`);let g=Ze(i),_=[],v=[],y=[],b=1,x=l,S=0,C=0;for(let e=0;e<o;e++)_.push(Ye(i,`literal`in p?{literal:t(p.literal,e)}:{expr:`${Ge(r)}(ns, ${ne(e)})`},r)),v.push(P(x,`${n}.opts.frequency`)),y.push(P(b,`${n}.opts.gain`)),S+=b>=0?b*g[0]:b*g[1],C+=b>=0?b*g[1]:b*g[0],b*=c,x*=s;r.libRoots.add(i===`worleyNoise`?`pcg_worley`:He[i]);let w=`vec3<f32>(${P(u,`${n}.opts.offset`)}, ${P(d,`${n}.opts.offset`)}, ${P(f,`${n}.opts.offset`)})`,T=`fn @NAME@(p: vec3<f32>) -> f32 {
${`literal`in p?``:`  let ns = ${p.expr};\n`}  var seeds = array<u32, ${o}>(${_.join(`, `)});
  var freqs = array<f32, ${o}>(${v.join(`, `)});
  var amps = array<f32, ${o}>(${y.join(`, `)});
  var sum = 0f;
  for (var o = 0u; o < ${ne(o)}; o++) {
    sum = sum + ${Qe(i,`seeds[o]`,`p * freqs[o] + `+w)} * amps[o];
  }
  return sum;
}`,E=r.helper(`fbm`,T),D=r.emit(`${E}(${h.ref})`,1);if(a.normalized!==!0)return D;if(!(C>S))throw new N(`${n}: fbm: normalized: true needs a non-degenerate output range, got [${S}, ${C}] for this octaves/gain configuration`);return Xe(r,D,[S,C],`${n}.opts.normalized`)});var $e=new Set([`valueNoise`,`perlinNoise`,`simplexNoise`,`worleyNoise`,`fbm`]);function et(e,t){if(!H(e))return;let n=e.fn;if(n===`param`){let n=m(e);n!==void 0&&et(n,t);return}if(n===`attribute`||n===`attributeIs`){typeof e.name==`string`&&t.add(e.name);return}if(n===`byAttribute`){typeof e.name==`string`&&t.add(e.name);for(let n of v(e))et(n,t);return}if(n===`position`){t.add(`P`);return}if(n===`randomField`){t.add(`P`),t.add(`seed`);return}if(typeof n==`string`&&$e.has(n)){let n=e.opts;H(n)&&n.position!==void 0?et(n.position,t):t.add(`P`);return}let r=e.args;if(Array.isArray(r))for(let e of r)et(e,t)}var tt=16;function nt(e,t){return`${JSON.stringify(e)},${JSON.stringify(t)}`}var rt={names:[],slots:new Map,arities:[],attrIs:[],attrIsSlots:new Map};function it(e){return typeof e==`number`?1:e.length}function at(e,t){if(H(e)){if(t(e),e.fn===`param`){let n=m(e);n!==void 0&&at(n,t);return}for(let n of v(e))at(n,t)}}function ot(e){let t=ct.get(e);if(t!==void 0)return t;let n=lt.get(e);if(n!==void 0)throw n;try{let t=st(e);return ct.set(e,t),t}catch(t){throw t instanceof N&&lt.set(e,t),t}}function st(e){let t=new Map,n=new Set,r=new Map;if(at(e,e=>{if(e.fn===`attributeIs`){if(typeof e.name!=`string`||e.name===``||typeof e.value!=`string`)return;r.set(nt(e.name,e.value),{attr:e.name,value:e.value});return}if(e.fn===`byAttribute`){if(typeof e.name!=`string`||e.name===``||!H(e.cases))return;for(let t of Object.keys(e.cases))r.set(nt(e.name,t),{attr:e.name,value:t});return}if(e.fn!==`param`||typeof e.name!=`string`||e.name===``)return;let i=e.name;if(m(e)!==void 0)return;if(p(e))throw new N(`param ${JSON.stringify(i)} is bound to a Field that carries no spec (a makeField closure, or something composed over one), so there is nothing to compile in its place; this expression evaluates on the CPU — build the bound field with the grammar constructors or fieldFromJson if it should lower`);n.add(i);let a=T(e);if(a===void 0)return;let o=it(a);if(o>4)throw new N(`param ${JSON.stringify(i)} is bound to a ${o}-tuple, but a uniform slot holds 4 components; bind a tuple of 1 to 4, or evaluate this field on the CPU`);let s=t.get(i);if(s!==void 0&&s!==o)throw new N(`param ${JSON.stringify(i)} is bound to a ${s}-tuple in one place and a ${o}-tuple in another within the same expression; one uniform slot serves the name, so both references must have the same arity`);t.set(i,o)}),n.size===0&&r.size===0)return rt;let i=[...n].sort(),a=[...r.keys()].sort(),o=i.length+a.length;if(o>tt)throw new N(`this field needs ${o} uniform constant slots (${i.length} distinct params and ${a.length} distinct string literals across its attributeIs tests and byAttribute case keys), but a kernel carries at most ${tt}; split the expression, or evaluate it on the CPU (raise MAX_FIELD_CONST_SLOTS in compile.ts if an expression legitimately needs more)`);return{names:i,slots:new Map(i.map((e,t)=>[e,t])),arities:i.map(e=>t.get(e)??1),attrIs:a.map(e=>r.get(e)),attrIsSlots:new Map(a.map((e,t)=>[e,i.length+t]))}}var ct=new WeakMap,lt=new WeakMap,ut=new WeakMap;function dt(e){let t=``;return e.names.length>0&&(t+=`|params=[${e.names.map((t,n)=>`${JSON.stringify(t)}:${e.arities[n]}`).join(`,`)}]`),e.attrIs.length>0&&(t+=`|attrIs=[${e.attrIs.map(e=>nt(e.attr,e.value)).join(`;`)}]`),t}function ft(e,t){let n=ot(e);if(n.names.length===0&&n.attrIs.length===0)return t;let r=ut.get(e);if(r!==void 0)return r;let i=`${c(e).key}${dt(n)}`;return ut.set(e,i),i}function pt(e,t){return e.length===t.length&&e.every((e,n)=>Object.is(e,t[n]))}function mt(e,t){return t.constSlots===0?{values:[]}:t.attrIsSlots.length>0?{problem:`this kernel carries ${t.attrIsSlots.length} string-literal slot(s) (${t.attrIsSlots.map(e=>`${JSON.stringify(e.attr)} == ${JSON.stringify(e.value)}`).join(`, `)}) whose values are string-table indices of the geometry being cooked; fill them with constSlotValues, which takes that geometry's attribute set`}:ht(e,t)}function ht(e,t){let n=new Map,r;if(at(e,e=>{if(e.fn!==`param`||typeof e.name!=`string`||e.name===``)return;let t=e.name;if(m(e)!==void 0)return;let i=T(e);if(i===void 0){r??=`param ${JSON.stringify(t)} has no bound value`;return}let a=typeof i==`number`?[i]:[...i],o=n.get(t);o===void 0?n.set(t,a):pt(o,a)||(r??=`param ${JSON.stringify(t)} is bound to two different values in one expression`)}),r!==void 0)return{problem:r};let i=[];for(let e of t.paramNames){let t=n.get(e);if(t===void 0)return{problem:`param ${JSON.stringify(e)} is not referenced by this spec`};for(let e=0;e<4;e++)i.push(e<t.length?t[e]:0)}return{values:i}}var gt=-1;function _t(e,t,n){if(t.constSlots===0)return{values:[]};let r=ht(e,t);if(`problem`in r||t.attrIsSlots.length===0)return r;let i=[...r.values];for(let e of t.attrIsSlots){let t=n.get(e.attr);if(t===void 0||t.type!==`string`)return{problem:`attributeIs ${JSON.stringify(e.attr)}: this geometry has no string attribute of that name (${t===void 0?`no such attribute`:`it is ${t.type}`}), so the literal has no index to resolve to`};let r=t.lookupString(e.value)??gt;for(let e=0;e<4;e++)i.push(e===0?r:0)}return{values:i}}var vt=new Set([`f32`,`i32`,`u32`,`bool`,`string`]);function yt(e){if(!H(e)||!H(e.attributes))throw new N(`compileFieldSpec: layout must be { attributes: { name: { type, tupleSize } } }`);for(let[t,n]of Object.entries(e.attributes)){if(!H(n)||!vt.has(n.type))throw new N(`kernel layout attribute ${JSON.stringify(t)}: unknown type ${JSON.stringify(n?.type)}; valid types: "f32", "i32", "u32", "bool", "string" (a string column binds as u32 and is readable only through attributeIs)`);let e=n.tupleSize;if(typeof e!=`number`||!Number.isInteger(e)||e<1)throw new N(`kernel layout attribute ${JSON.stringify(t)}: tupleSize must be a positive integer, got ${String(e)}`)}}function bt(e){return typeof e==`number`?{fn:`constant`,value:e}:Array.isArray(e)?{fn:`constant`,value:[...e]}:e}function xt(e){return e.type===`bool`||e.type===`string`?`u32`:e.type}function St(e,t){yt(t);let n=bt(e),r=c(n),i=new Set;et(n,i);let a=[...i].filter(e=>Object.hasOwn(t.attributes,e)).sort(),o=ot(n),s=new Oe(t,a,o),l=`f32`,u=0,d=[],f=e=>{if(u=e.size,e.size===1)d.push(`  outBuf[i] = ${e.ref};`);else for(let t=0;t<e.size;t++)d.push(`  outBuf[${q(e.size,t)}] = ${e.ref}.${Ee[t]};`)},p=n.fn===`attribute`?n.name:n.fn===`position`?`P`:void 0;if(n.fn===`index`)l=`u32`,u=1,d.push(`  outBuf[i] = i;`);else if(p!==void 0){let e=je(s,`$`,p,n.fn===`position`?3:n.tupleSize,n.fn===`position`?`position reads `:``);if(e.type===`i32`||e.type===`u32`){l=e.type,u=e.tupleSize;let t=s.binding(p);for(let n=0;n<e.tupleSize;n++)d.push(`  outBuf[${q(e.tupleSize,n)}] = ${t.varName}[${q(e.tupleSize,n)}];`)}else f(Ie(n,`$`,s))}else f(Ie(n,`$`,s));let m=s.boundAttrs(),h=m.map(e=>({name:e.name,type:xt(e.attr),tupleSize:e.attr.tupleSize,binding:e.binding})),g=m.length+1,_=[`@group(0) @binding(0) var<uniform> params: PcgParams;`];for(let e of m)_.push(`@group(0) @binding(${e.binding}) var<storage, read> ${e.varName}: array<${xt(e.attr)}>; // attribute ${JSON.stringify(e.name)}: ${e.attr.type} tupleSize ${e.attr.tupleSize}`);_.push(`@group(0) @binding(${g}) var<storage, read_write> outBuf: array<${l}>;`);let v=o.names.length+o.attrIs.length,y=[`// Generated by pcg-ts compileFieldSpec (WGSL field kernel).
// Dispatch: 1D, chunked; each chunk runs ceil(chunkElements / ${we}) workgroups of ${we}
// with element index i = chunkOffset + gid.x; one invocation per element.

struct PcgParams {
  count: u32,
  seed: u32,
  chunkOffset: u32,${v===0?``:`\n  _pad0: u32,\n  consts: array<vec4<f32>, ${v}>,`}
}

${_.join(`
`)}`,...se(s.libRoots),...s.helperBlocks(),`@compute @workgroup_size(${we})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x + params.chunkOffset;
  if (i >= params.count) {
    return;
  }
${[...s.lines,...d].join(`
`)}
}`],b=m.map(e=>`${JSON.stringify(e.name)}:${e.attr.type}x${e.attr.tupleSize}`).join(`,`),x=`${r.key}${dt(o)}`;return ut.set(n,x),{wgsl:`${y.join(`

`)}\n`,entryPoint:`main`,workgroupSize:we,outTupleSize:u,outType:l,inputs:h,bindings:{uniforms:0,output:g},constSlots:v,paramNames:o.names,attrIsSlots:o.attrIs,uniformBytes:le(v),usesSeed:s.usesSeed,key:`${Te}|spec=${x}|layout=[${b}]`}}function Ct(e){return e}var Q={MAP_READ:1,COPY_SRC:4,COPY_DST:8,VERTEX:32,UNIFORM:64,STORAGE:128},wt={READ:1},Tt=256;function Et(e){let t=Tt;for(;t<e;)t*=2;return t}var Dt=class{device;maxPooledBytes;free=new Map;meta=new Map;detachedSet=new WeakSet;idleBytes=0;idleCount=0;created=0;reused=0;destroyed=0;detachedTotal=0;detachedLive=0;detachedLiveBytes=0;constructor(e,t){this.device=e,this.maxPooledBytes=t}acquire(e,t){let n=Et(e),r=`${t}|${n}`,i=this.free.get(r)?.pop();if(i!==void 0)return this.idleBytes-=n,this.idleCount--,this.reused++,i;let a=this.device.createBuffer({size:n,usage:t});return this.meta.set(a,{key:r,bytes:n}),this.created++,a}release(e){let t=this.meta.get(e);if(t===void 0)throw this.detachedSet.has(e)?Error(`BufferPool.release: buffer was detached from this pool, so the pool no longer owns it and cannot reclaim it; destroy it through the DetachedBuffer that detach() returned (or the handle wrapping it) and stop releasing it`):Error(`BufferPool.release: buffer was not acquired from this pool`);if(this.idleBytes+t.bytes>this.maxPooledBytes){this.meta.delete(e),e.destroy(),this.destroyed++;return}let n=this.free.get(t.key);n===void 0&&(n=[],this.free.set(t.key,n)),n.push(e),this.idleBytes+=t.bytes,this.idleCount++}detach(e){let t=this.meta.get(e);if(t===void 0)throw Error(this.detachedSet.has(e)?`BufferPool.detach: buffer was already detached from this pool; ownership can only leave once — reuse the DetachedBuffer the first detach() returned`:`BufferPool.detach: buffer was not acquired from this pool`);this.meta.delete(e),this.detachedSet.add(e),this.detachedTotal++,this.detachedLive++,this.detachedLiveBytes+=t.bytes;let n=!1,r=this;return{buffer:e,bytes:t.bytes,get destroyed(){return n},destroy(){n||(n=!0,r.detachedLive--,r.detachedLiveBytes-=t.bytes,r.destroyed++,e.destroy())}}}get stats(){return{buffersCreated:this.created,buffersReused:this.reused,buffersDestroyed:this.destroyed,pooledBuffers:this.idleCount,pooledBytes:this.idleBytes,buffersDetached:this.detachedTotal,detachedBuffers:this.detachedLive,detachedBytes:this.detachedLiveBytes}}dispose(){for(let e of this.free.values())for(let t of e)this.meta.delete(t),t.destroy(),this.destroyed++;this.free.clear(),this.idleBytes=0,this.idleCount=0}},Ot=`webgpu`,kt=class{backend=Ot;byteLength;detached;label;constructor(e,t,n){this.detached=e,this.byteLength=t,this.label=n}get disposed(){return this.detached.destroyed}get resource(){if(this.detached.destroyed)throw Error(`device transforms handle (${this.label}) was disposed; its GPU buffer is destroyed and cannot be bound. Dispose a handle only after the last frame that reads it, and re-cook to obtain a fresh one (device-resident outputs are never memoized, so every cook produces a new handle)`);return this.detached.buffer}dispose(){this.detached.destroy()}};function At(e,t,n){return new kt(e,t,n)}var jt=65535;function Mt(e,t){let n=jt*e;return Math.max(e,Math.floor(Math.min(t??n,n)/e)*e)}var Nt=16,Pt=`pcg-resident-run/6`;function Ft(e){return e.format===Pt?e:null}var It={reason:`run-plan-failed`},Lt=[`+x`,`-x`,`+y`,`-y`,`+z`,`-z`];function Rt(e){if(typeof e!=`object`||!e||Array.isArray(e))return!1;let t=e;if(t.fn===`randomField`)return!0;for(let e of v(t))if(Rt(e))return!0;return!1}function zt(e){return Array.isArray(e)&&e.length===3&&e.every(e=>typeof e==`number`&&Number.isFinite(e))}var $=class extends Error{};function Bt(e,t,n,r,i){let a=[...e].map(([e,t])=>({name:e,slot:t})),o=i||r===null,s=t.reduce((e,t)=>e+t.bytes,0),c=n.reduce((e,t)=>e+t,0),l=o?a.reduce((e,n)=>e+t[n.slot].bytes,0):0;return{writtenList:a,materialize:o,totalBytes:s+c+l+(r?.bytes??0)+(r?.colorBytes??0)+(r?.channelBytes??0)+(r?.permBytes??0)}}function Vt(e,i,a,o,s={}){let c=s.deviceInstanceAttrs===!0,l=i.count,u=new Map(Object.entries(i.attributes)),d=[],f=new Map,p=[],m=new Map,h=[],g=[],v=null,y=()=>Object.fromEntries(u),x=e=>{let t=f.get(e);if(t!==void 0)return t;let n=u.get(e);if(n===void 0||n.type===`string`)throw new $(e);let r=d.length;return d.push({bytes:l*n.tupleSize*4,init:`attr`,name:e}),f.set(e,r),r},S=(e,t,n)=>{let r=d.length;return d.push({bytes:l*t*4,init:n,name:e}),f.set(e,r),r},C=(e,t,n)=>{let r=u.get(e);if(r===void 0||r.type!==t||r.tupleSize!==n)throw new $(e)},w=(e,t,n)=>{let r=t.length/4;if(r>=4)throw Error(`resident run: "${n}" needs more than 4 uniform constant slots for its constant params; raise MAX_APPLY_CONST_SLOTS in applyKernels.ts (each slot costs 16 bytes of the per-chunk uniform and nothing else)`);for(let n=0;n<4;n++)t.push(n<e.length?e[n]:0);return{kind:`const`,tupleSize:e.length,slot:r}},T=(e,t,n,i,a,s)=>{let c;if(r(e)){let t=b(e,o);if(t===void 0)throw new $(`no spec`);if(m.has(`P`)&&Rt(t))throw new $(`identity after P write`);c=t}else if(typeof e==`number`||Array.isArray(e)&&e.every(e=>typeof e==`number`)){let t=typeof e==`number`?[e]:e;if(t.length<1||t.length>4||i!==null&&!i.includes(t.length))throw new $(`tuple`);for(let e of t)if(!Number.isFinite(Math.fround(e)))throw new $(`f32 range`);return{param:w(t,a,s),ref:null}}else throw new $(`bad param value`);let u;try{u=St(c,{attributes:y()})}catch{throw new $(`compile`)}if(u.inputs.length+1>8)throw new $(`buffers`);if(i!==null&&!i.includes(u.outTupleSize))throw new $(`tuple`);if(u.attrIsSlots.length>0)throw new $(`attributeIs / byAttribute need a per-dispatch string table`);let d=mt(c,u);if(`problem`in d)throw new $(`param bindings`);let f=p.length;return p.push(l*u.outTupleSize*4),n.push({key:u.key,wgsl:u.wgsl,entryPoint:u.entryPoint,workgroupSize:u.workgroupSize,seed:t,uniformsBinding:u.bindings.uniforms,uniformBytes:u.uniformBytes,consts:d.values,perBatch:!1,bindings:[...u.inputs.map(e=>({binding:e.binding,ref:{kind:`slot`,index:x(e.name)}})),{binding:u.bindings.output,ref:{kind:`col`,index:f}}]}),{param:{kind:`column`,type:u.outType,tupleSize:u.outTupleSize},ref:{kind:`col`,index:f}}},E=(e,t,n,r,i=!1)=>{if(e.constSlots*4!==r.length)throw Error(`resident run: apply kernel "${e.key}" declares ${e.constSlots} constant slots but the planner allocated ${r.length/4}`);return{key:e.key,wgsl:e.wgsl,entryPoint:e.entryPoint,workgroupSize:e.workgroupSize,seed:t,uniformsBinding:0,uniformBytes:e.uniformBytes,consts:r,perBatch:i,bindings:e.bindings.map(e=>{let t=n[e.role];if(t===void 0)throw new $(`unmapped role ${e.role}`);return{binding:e.binding,ref:t}})}};try{for(let r of e){let i=r===e[e.length-1],a=[],o=[],s=r.params;switch(r.kind){case`setAttribute`:{let e=s.name,n=s.type,i=s.tupleSize;if(typeof e!=`string`)throw new $(`name`);if(n!==`f32`&&n!==`i32`&&n!==`u32`&&n!==`bool`)throw new $(`type`);if(typeof i!=`number`||!Number.isInteger(i)||i<1||i>4)throw new $(`tupleSize`);let c=typeof s.seed==`number`?s.seed:NaN,l=c===0?r.seed:t(r.seed,c),{param:d,ref:f}=T(s.value,l,a,i===1?[1]:[1,i],o,r.kind),p=S(e,i,`none`);u.set(e,{type:n,tupleSize:i}),m.set(e,p),h.push({op:`replace`,name:e,type:n,tupleSize:i});let g={target:{kind:`slot`,index:p}};f!==null&&(g.value=f),a.push(E(ge(d,n,i),0,g,o));break}case`transformPoints`:{C(`P`,`f32`,3);let e=T(s.translate,r.seed,a,[1,3],o,r.kind),t=T(s.rotateEuler,r.seed,a,[1,3],o,r.kind),n=T(s.scale,r.seed,a,[1,3],o,r.kind),i=u.get(`rot`),c=i!==void 0&&i.type===`f32`&&i.tupleSize===4,l=u.get(`scale`),d=l!==void 0&&l.type===`f32`&&l.tupleSize===3,f=x(`P`);m.set(`P`,f);let p={P:{kind:`slot`,index:f}};if(e.ref!==null&&(p.translate=e.ref),t.ref!==null&&(p.rotateEuler=t.ref),n.ref!==null&&(p.scale=n.ref),c){let e=x(`rot`);m.set(`rot`,e),p.rot={kind:`slot`,index:e}}if(d){let e=x(`scale`);m.set(`scale`,e),p.scaleAttr={kind:`slot`,index:e}}a.push(E(ve(e.param,t.param,n.param,c,d),0,p,o));break}case`jitterPoints`:{if(C(`P`,`f32`,3),m.has(`P`))throw new $(`identity after P write`);let e=typeof s.seed==`number`?s.seed:NaN,n=t(r.seed,e),i=T(s.amount,n,a,[1,3],o,r.kind),c=u.get(`seed`),l=c!==void 0;if(l&&(c.type!==`u32`||c.tupleSize!==1))throw new $(`seed attribute shape`);let d=x(`P`);m.set(`P`,d);let f={P:{kind:`slot`,index:d}};i.ref!==null&&(f.amount=i.ref),l&&(f.seed={kind:`slot`,index:x(`seed`)}),a.push(E(ye(i.param,l),n,f,o));break}case`orientAlongVector`:{let e=s.axis;if(!Lt.includes(e))throw new $(`axis`);if(!zt(s.up))throw new $(`up`);let t=T(s.direction,r.seed,a,[1,3],o,r.kind),n=s.up,i=n[0]*n[0]+n[1]*n[1]+n[2]*n[2],c=i>0?1/Math.sqrt(i):0,l=[n[0]*c,n[1]*c,n[2]*c];for(let e of l)if(!Number.isFinite(Math.fround(e)))throw new $(`up range`);let d=w(l,o,r.kind),f=u.get(`rot`),p=f!==void 0&&f.type===`f32`&&f.tupleSize===4?x(`rot`):S(`rot`,4,`quat-default`);u.set(`rot`,{type:`f32`,tupleSize:4}),m.set(`rot`,p),h.push({op:`ensure-rot`});let g={rot:{kind:`slot`,index:p}};t.ref!==null&&(g.direction=t.ref),a.push(E(xe(t.param,e,d),0,g,o));break}case`spawnInstances`:{if(!i)throw new $(`spawnInstances must be the run's last member`);let e=s.assetId;if(typeof e!=`string`||e===``)throw new $(`assetId`);if(C(`P`,`f32`,3),l>1048576)throw new $(`${l} instances over MAX_INSTANCES`);let t=s.assetAttr;if(t!==void 0&&typeof t!=`string`)throw new $(`assetAttr`);let r=t===void 0?``:t;if(r!==``){let e=u.get(r);if(e===void 0)throw new $(`assetAttr "${r}" not on the point domain`);if(e.type!==`string`)throw new $(`assetAttr "${r}" is ${e.type}, not string`)}let d=s.instanceAttrs,f=[];if(d!==void 0){if(!Array.isArray(d))throw new $(`instanceAttrs`);if(d.length>0&&!c)throw new $(`instanceAttrs names ${d.length} per-instance channel(s) and this resolver did not opt in to device channels (deviceInstanceAttrs)`);let e=new Set;for(let t of d){if(typeof t!=`string`)throw new $(`instanceAttrs entry is not a string`);if(t===``)throw new $(`instanceAttrs contains an empty name`);if(e.has(t))throw new $(`instanceAttrs names "${t}" twice`);if(e.add(t),t===`color`)throw new $(`instanceAttrs cannot carry "${_}" — the name is reserved for per-instance RGB (colorAttr is the route)`);let r=u.get(t);if(r===void 0)throw new $(`instanceAttrs "${t}" not on the point domain`);if(r.type===`string`)throw new $(`instanceAttrs "${t}" is a string attribute`);if(!Number.isInteger(r.tupleSize)||r.tupleSize<1||r.tupleSize>4)throw new $(`instanceAttrs "${t}" has tupleSize ${r.tupleSize}; a device channel binds as a scalar or a vec2/vec3/vec4`);let i;try{i=n(r.type,r.tupleSize)}catch{throw new $(`instanceAttrs "${t}" has no device channel layout`)}f.push({name:t,type:r.type,itemSize:r.tupleSize,components:i.components,byteStride:i.byteStride})}}let p=s.colorAttr;if(p!==void 0&&typeof p!=`string`)throw new $(`colorAttr`);let m=p===void 0?``:p,h=0;if(m!==``){let e=u.get(m);if(e===void 0)throw new $(`colorAttr "${m}" not on the point domain`);if(e.type!==`f32`||e.tupleSize<3)throw new $(`colorAttr "${m}" is ${e.type}x${e.tupleSize}`);h=e.tupleSize}let g=u.get(`rot`),y=g!==void 0&&g.type===`f32`&&g.tupleSize===4,b=u.get(`scale`),S=b!==void 0&&b.type===`f32`&&b.tupleSize===3,w={P:{kind:`slot`,index:x(`P`)},transforms:{kind:`out`}};y&&(w.rot={kind:`slot`,index:x(`rot`)}),S&&(w.scaleAttr={kind:`slot`,index:x(`scale`)});let T=r!==``;T&&(w.perm={kind:`perm`}),h>0&&(w.color={kind:`slot`,index:x(m)},w.colors={kind:`colorOut`}),a.push(E(Se(y,S,T,h),0,w,o,T)),f.forEach((e,t)=>{let n={src:{kind:`slot`,index:x(e.name)},out:{kind:`channelOut`,index:t}};T&&(n.perm={kind:`perm`}),a.push(E(Ce(e.itemSize,e.components,T),0,n,[],T))}),v={assetId:e,assetAttr:r,colorAttr:m,colorTupleSize:h,count:l,bytes:l*64,colorBytes:h>0?l*Nt:0,channels:f,channelBytes:f.reduce((e,t)=>e+l*t.byteStride,0),permBytes:T?l*4:0};break}default:throw new $(`unknown kind ${r.kind}`)}g.push({id:r.id,type:r.type,steps:a})}}catch(e){if(e instanceof $)return It;throw e}let{writtenList:D,materialize:O,totalBytes:k}=Bt(m,d,p,v,i.needsGeometry);return k>a?{reason:`run-too-large`}:{plan:{format:Pt,count:l,members:g,slots:d,cols:p,written:D,layoutOps:h,materialize:O,instances:v,totalBytes:k}}}var Ht={f32:Float32Array,i32:Int32Array,u32:Uint32Array};function Ut(){return new Promise(e=>setTimeout(e,0))}async function Wt(t,n,r,a){let{device:o,pool:c}=t,{geo:l,signal:u,budgetMs:d}=r,f=n.count;if(l.attrs.point.count!==f)throw Error(`resident run: plan was built for ${f} points but the input geometry has ${l.attrs.point.count}; plans are single-cook artifacts — re-plan for new inputs`);let p=()=>{if(u?.aborted)throw new M},m=[],h=(e,t)=>{let n=c.acquire(e,t);return m.push(n),n},g=new Set,v=[];try{let r=l.attrs.point,u=n.slots.map(e=>{let t=h(e.bytes,Q.STORAGE|Q.COPY_DST|Q.COPY_SRC);if(e.init===`attr`){let n=r.require(e.name),i=e.bytes/4;if(n.type===`bool`){let e=new Uint32Array(i),r=n.data;for(let t=0;t<i;t++)e[t]=r[t];o.queue.writeBuffer(t,0,e)}else o.queue.writeBuffer(t,0,Ct(n.data.subarray(0,i)))}else if(e.init===`quat-default`){let n=new Float32Array(e.bytes/4);for(let e=3;e<n.length;e+=4)n[e]=1;o.queue.writeBuffer(t,0,n)}return t}),m=n.cols.map(e=>h(e,Q.STORAGE|Q.COPY_DST|Q.COPY_SRC)),y=n.instances===null?void 0:e(l,{defaultAssetId:n.instances.assetId,...n.instances.assetAttr===``?{}:{assetAttr:n.instances.assetAttr}}),b=n.instances!==null&&n.instances.permBytes>0?h(n.instances.permBytes,Q.STORAGE|Q.COPY_DST):void 0;b!==void 0&&y!==void 0&&o.queue.writeBuffer(b,0,y.perm);let x=Q.STORAGE|Q.COPY_DST|Q.COPY_SRC|Q.VERTEX,S=y===void 0?[]:Array.from(y.counts,e=>h(e*64,x)),C=y===void 0||n.instances===null||n.instances.colorBytes===0?[]:Array.from(y.counts,e=>h(e*Nt,x)),w=n.instances?.channels??[],T=y===void 0||w.length===0?[]:Array.from(y.counts,e=>w.map(t=>h(e*t.byteStride,x))),E=(e,t)=>{if(e.kind===`slot`)return u[e.index];if(e.kind===`col`)return m[e.index];if(e.kind===`colorOut`){let e=C[t];if(e===void 0)throw Error(`resident run: a kernel binds a retained instance-colour buffer but the plan declares no colour output (plan and kernels disagree)`);return e}if(e.kind===`channelOut`){let n=T[t]?.[e.index];if(n===void 0)throw Error(`resident run: a kernel binds retained per-instance channel ${e.index} but the plan declares no such channel (plan and kernels disagree)`);return n}if(e.kind===`perm`){if(b===void 0)throw Error(`resident run: a kernel binds the grouping permutation but the plan declares no per-point asset attribute (plan and kernels disagree)`);return b}let n=S[t];if(n===void 0)throw Error(`resident run: a kernel binds a retained instance-transform buffer but the plan declares no instances output (plan and kernels disagree)`);return n},D=o.createCommandEncoder(),O=D.beginComputePass(),k=performance.now();for(let e of n.members){p();for(let n of e.steps){let e=t.getPipeline(n.key,n.wgsl,n.entryPoint,a);O.setPipeline(e);let r=Mt(n.workgroupSize,t.maxElementsPerDispatch),i=n.perBatch&&y!==void 0?Array.from(y.counts,(e,t)=>({batch:t,elements:e,base:y.offsets[t]})):[{batch:0,elements:f,base:0}];for(let t of i){a!==void 0&&a.dispatches++;let i=new ArrayBuffer(n.uniformBytes),s=new Uint8Array(i),c=new Uint32Array(i,0,n.uniformBytes>=16?4:3);c[0]=t.elements,c[1]=n.seed>>>0,n.perBatch&&(c[3]=t.base),n.consts.length>0&&new Float32Array(i,16,n.consts.length).set(n.consts);let l=Math.ceil(t.elements/r);for(let i=0;i<l;i++){let a=h(n.uniformBytes,Q.UNIFORM|Q.COPY_DST);c[2]=i*r,o.queue.writeBuffer(a,0,s);let l=o.createBindGroup({layout:e.getBindGroupLayout(0),entries:[{binding:n.uniformsBinding,resource:{buffer:a}},...n.bindings.map(e=>({binding:e.binding,resource:{buffer:E(e.ref,t.batch)}}))]}),u=Math.min(r,t.elements-i*r);O.setBindGroup(0,l),O.dispatchWorkgroups(Math.ceil(u/n.workgroupSize))}}}d!==void 0&&performance.now()-k>d&&(await Ut(),p(),k=performance.now())}O.end();let ee=[],A,j=n.materialize?n.written.reduce((e,t)=>e+n.slots[t.slot].bytes,0):0;if(j>0){A=h(j,Q.COPY_DST|Q.MAP_READ);let e=0;for(let t of n.written){let r=n.slots[t.slot].bytes;D.copyBufferToBuffer(u[t.slot],0,A,e,r),ee.push(e),e+=r}}o.queue.submit([D.finish()]);let M;if(n.materialize){let e;if(A!==void 0){await A.mapAsync(wt.READ,0,j);try{e=A.getMappedRange(0,j).slice(0)}finally{A.unmap()}}p(),M=i(l);let t=M.attrs.point;for(let e of n.layoutOps)if(e.op===`replace`)t.replace(e.name,e.type,e.tupleSize);else{let e=t.get(`rot`);(!e||e.type!==`f32`||e.tupleSize!==4)&&(e&&t.remove(`rot`),t.add(`rot`,`f32`,4,[0,0,0,1]))}n.written.forEach((n,r)=>{let i=t.require(n.name),a=f*i.tupleSize;if(e===void 0)throw Error(`resident run: readback missing for a written attribute`);if(i.type===`bool`){let t=i.writable(),n=new Uint32Array(e,ee[r],a);for(let e=0;e<a;e++)t[e]=n[e]}else{let t=Ht[i.type];if(t===void 0)throw Error(`resident run: cannot materialize attribute "${n.name}" of type ${i.type}`);i.writable().set(new t(e,ee[r],a))}})}else p();let te;if(n.instances!==null){let e=n.instances.colorBytes>0;if(y===void 0||S.length!==y.order.length||C.length!==(e?y.order.length:0)||T.length!==(w.length>0?y.order.length:0)||T.some(e=>e.length!==w.length))throw Error(`resident run: the plan declares an instances output but the acquired transform buffers do not match the grouping (library bug: plan.instances, the grouping, and the acquired buffers must agree)`);let t=(e,t,n)=>{let r=c.detach(e);g.add(e);try{return At(r,t,n)}catch(e){throw r.destroy(),e}},r=[];for(let n=0;n<y.order.length;n++){let i=y.order[n],a=y.counts[n],o=t(S[n],a*64,`${a} instances of "${i}"`);v.push(o);let c=Object.create(null);if(e){let e=t(C[n],a*Nt,`${a} instance colours of "${i}"`);v.push(e),c[_]={handle:e,type:`f32`,itemSize:3}}w.forEach((e,r)=>{let o=t(T[n][r],a*e.byteStride,`${a} instance "${e.name}" values of "${i}"`);v.push(o),c[e.name]={handle:o,type:e.type,itemSize:e.itemSize}}),r.push(s(i,a,o,c))}te=r}a!==void 0&&(a.residentRuns++,a.fusedNodes+=n.members.length,a.readbacksSaved+=n.members.length-+!!n.materialize);let N={};return M!==void 0&&(N.geo=M),te!==void 0&&(N.deviceBatches=te),N}catch(e){for(let e of v)e.dispose();throw e instanceof M?e:Error(`GpuFieldEvaluator: resident run failed (${n.members.length} fused nodes [${n.members.map(e=>`"${e.id}"`).join(`, `)}], ${f} points): ${e instanceof Error?e.message:String(e)}`,{cause:e})}finally{for(let e of m)g.has(e)||c.release(e)}}var Gt=`gpu2`,Kt=268435456,qt=[`spawnInstances`],Jt={f32:Float32Array,i32:Int32Array,u32:Uint32Array},Yt={f32:Float32Array,i32:Int32Array,u32:Uint32Array};function Xt(e){let t=e=>e!==void 0&&e!==``?e:`?`;return[Gt,t(e?.vendor),t(e?.architecture),t(e?.device),t(e?.description)].join(`|`)}function Zt(e,t){return e!==void 0&&(e.fallbacks[t]=(e.fallbacks[t]??0)+1),null}var Qt=class{cacheSalt;residentTerminals;acceptDerivedSpecs;deviceInstanceAttrs;device;kernels=new Map;pipelines=new Map;pool;maxElementsPerDispatch;maxResidentBytes;constructor(e,t={}){if(t.maxElementsPerDispatch!==void 0&&!Number.isFinite(t.maxElementsPerDispatch))throw Error(`GpuFieldEvaluator: maxElementsPerDispatch must be a finite number, got ${t.maxElementsPerDispatch}; leave it unset to use the device maximum`);if(t.deviceInstanceAttrs===!0&&t.deviceInstances!==!0)throw Error(`GpuFieldEvaluator: deviceInstanceAttrs requires deviceInstances: true — per-instance channels ride on a device-resident spawner terminal, and without deviceInstances no spawner is one, so the flag could never take effect. Pass both to produce channels on the device (and bind them yourself from batch.attributes[name].handle.resource), or drop deviceInstanceAttrs to let the CPU spawner produce transforms and channels together.`);this.device=e,this.cacheSalt=Xt(t.adapterInfo??e.adapterInfo),this.pool=new Dt(e,t.maxPooledBytes??Kt),this.maxElementsPerDispatch=t.maxElementsPerDispatch,this.maxResidentBytes=t.maxResidentBytes??536870912,this.residentTerminals=t.deviceInstances===!0?qt:[],this.deviceInstanceAttrs=t.deviceInstanceAttrs===!0,this.acceptDerivedSpecs=f(t)}get pipelineCacheSize(){return this.pipelines.size}get kernelCacheSize(){return this.kernels.size}get poolStats(){return this.pool.stats}dispose(){this.pool.dispose()}chunkElements(e){let t=jt*e.workgroupSize,n=Math.min(this.maxElementsPerDispatch??t,t);return Math.max(e.workgroupSize,Math.floor(n/e.workgroupSize)*e.workgroupSize)}resolveField(e,t,n){let r=b(e,this.acceptDerivedSpecs);if(r===void 0)return Zt(n,g(e));let i=t.geo.attrs[t.domain],a={},o=[];for(let e of i.names().sort()){let t=i.get(e);t!==void 0&&(a[e]={type:t.type,tupleSize:t.tupleSize},o.push(`${JSON.stringify(e)}:${t.type}x${t.tupleSize}`))}let s;try{s=ft(r,e.key)}catch{return Zt(n,`compile-error`)}let c=`${s.length}#${s}|${o.join(`,`)}`,l=this.kernels.get(c);if(l===void 0){try{l=St(r,{attributes:a})}catch(e){l=e instanceof Error?e:Error(String(e))}this.kernels.set(c,l)}if(l instanceof Error)return Zt(n,`compile-error`);if(l.inputs.length+1>8)return Zt(n,`too-many-buffers`);let u=_t(r,l,i);if(`problem`in u)return Zt(n,`param-bindings`);let d=i.count;if(d===0)return Promise.resolve({data:new Yt[l.outType](0),tupleSize:l.outTupleSize});let f=this.getPipeline(l.key,l.wgsl,l.entryPoint,n);return n!==void 0&&n.dispatches++,this.dispatch(e,t,l,f,d,u.values)}getPipeline(e,t,n,r){let i=this.pipelines.get(e);if(i!==void 0)return r!==void 0&&r.pipelineCacheHits++,i;let a=this.device.createShaderModule({code:t}),o=this.device.createComputePipeline({layout:`auto`,compute:{module:a,entryPoint:n}});return this.pipelines.set(e,o),r!==void 0&&r.pipelinesCompiled++,o}planRun(e,t,n){let r=Vt(e,t,this.maxResidentBytes,this.acceptDerivedSpecs,{deviceInstanceAttrs:this.deviceInstanceAttrs});return`plan`in r?r.plan:(n!==void 0&&(n.fallbacks[r.reason]=(n.fallbacks[r.reason]??0)+1),null)}executeRun(e,t,n){let r=Ft(e);return r===null?Promise.reject(Error(`GpuFieldEvaluator.executeRun: plan was not produced by this library's planRun; pass the object returned by planRun on the same resolver`)):Wt({device:this.device,pool:this.pool,maxElementsPerDispatch:this.maxElementsPerDispatch,getPipeline:(e,t,n,r)=>this.getPipeline(e,t,n,r)},r,t,n)}async dispatch(e,t,n,r,i,a){let o=this.device,s=[],c=(e,t)=>{let n=this.pool.acquire(e,t);return s.push(n),n};try{let e=this.chunkElements(n),s=Math.ceil(i/e),l=[],u=t.geo.attrs[t.domain];for(let e of n.inputs){let t=u.require(e.name),n=i*e.tupleSize,r;if(t.type===`bool`){let e=new Uint32Array(n),i=t.data;for(let t=0;t<n;t++)e[t]=i[t];r=e}else r=Ct(t.data.subarray(0,n));let a=c(n*4,Q.STORAGE|Q.COPY_DST);o.queue.writeBuffer(a,0,r),l.push({binding:e.binding,resource:{buffer:a}})}let d=i*n.outTupleSize*4,f=c(d,Q.STORAGE|Q.COPY_SRC);l.push({binding:n.bindings.output,resource:{buffer:f}});let p=c(d,Q.COPY_DST|Q.MAP_READ),m=new ArrayBuffer(n.uniformBytes),h=new Uint8Array(m),g=new Uint32Array(m,0,3);g[0]=i,g[1]=t.seed>>>0,a.length>0&&new Float32Array(m,16,a.length).set(a);let _=[];for(let t=0;t<s;t++){let i=c(n.uniformBytes,Q.UNIFORM|Q.COPY_DST);g[2]=t*e,o.queue.writeBuffer(i,0,h),_.push(o.createBindGroup({layout:r.getBindGroupLayout(0),entries:[{binding:n.bindings.uniforms,resource:{buffer:i}},...l]}))}let v=o.createCommandEncoder(),y=v.beginComputePass();y.setPipeline(r);for(let t=0;t<s;t++){let r=Math.min(e,i-t*e);y.setBindGroup(0,_[t]),y.dispatchWorkgroups(Math.ceil(r/n.workgroupSize))}y.end(),v.copyBufferToBuffer(f,0,p,0,d),o.queue.submit([v.finish()]),await p.mapAsync(wt.READ,0,d);let b;try{b=p.getMappedRange(0,d).slice(0)}finally{p.unmap()}return{data:new Jt[n.outType](b),tupleSize:n.outTupleSize}}catch(n){throw Error(`GpuFieldEvaluator: dispatch failed for field ${e.key} (${i} elements on the ${t.domain} domain): ${n instanceof Error?n.message:String(n)}`,{cause:n})}finally{for(let e of s)this.pool.release(e)}}};export{Qt as t};