/* Minimal binary FBX reader / writer + UV atlas remapper.
   Only what the Field Kit needs: geometry, UV layers, material assignment,
   connections. Arrays are re-emitted uncompressed. */

const MAGIC = "Kaydara FBX Binary  ";
const FOOTER_MAGIC = [0xfa, 0xbc, 0xab, 0x09, 0xd0, 0xc8, 0xd4, 0x66, 0xb1, 0x76, 0xfb, 0x83, 0x1c, 0xf7, 0x26, 0x7e];

function latin(u8, off, len) {
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(u8[off + i]);
  return s;
}
function bytesToStr(b) { return latin(b, 0, b.length); }
function strToBytes(s) {
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
  return b;
}
function inflate(raw) {
  if (typeof window !== "undefined" && window.pako) return window.pako.inflate(raw);
  throw new Error("zlib decompressor unavailable");
}

function toTyped(t, raw, len) {
  const buf = raw.buffer.byteLength === raw.byteLength && raw.byteOffset === 0 ? raw.buffer : raw.slice().buffer;
  if (t === "f") return new Float32Array(buf, 0, len);
  if (t === "d") return new Float64Array(buf, 0, len);
  if (t === "i") return new Int32Array(buf, 0, len);
  if (t === "l") return new BigInt64Array(buf, 0, len);
  return new Uint8Array(buf, 0, len);
}

function readProp(dv, u8, off) {
  const t = String.fromCharCode(dv.getUint8(off)); off++;
  switch (t) {
    case "Y": return { prop: { t, v: dv.getInt16(off, true) }, off: off + 2 };
    case "C": return { prop: { t, v: dv.getUint8(off) }, off: off + 1 };
    case "I": return { prop: { t, v: dv.getInt32(off, true) }, off: off + 4 };
    case "F": return { prop: { t, v: dv.getFloat32(off, true) }, off: off + 4 };
    case "D": return { prop: { t, v: dv.getFloat64(off, true) }, off: off + 8 };
    case "L": return { prop: { t, v: Number(dv.getBigInt64(off, true)) }, off: off + 8 };
    case "S":
    case "R": {
      const len = dv.getUint32(off, true); off += 4;
      return { prop: { t, v: u8.slice(off, off + len) }, off: off + len };
    }
    default: {
      const len = dv.getUint32(off, true), enc = dv.getUint32(off + 4, true), clen = dv.getUint32(off + 8, true);
      off += 12;
      let raw = u8.slice(off, off + clen);
      if (enc === 1) raw = inflate(raw);
      return { prop: { t, v: toTyped(t, raw, len) }, off: off + clen };
    }
  }
}

function readNode(dv, u8, off, big) {
  let endOffset, numProps, propLen;
  if (big) {
    endOffset = Number(dv.getBigUint64(off, true));
    numProps = Number(dv.getBigUint64(off + 8, true));
    propLen = Number(dv.getBigUint64(off + 16, true));
    off += 24;
  } else {
    endOffset = dv.getUint32(off, true);
    numProps = dv.getUint32(off + 4, true);
    propLen = dv.getUint32(off + 8, true);
    off += 12;
  }
  const nameLen = dv.getUint8(off); off += 1;
  if (endOffset === 0) return null;
  const name = latin(u8, off, nameLen); off += nameLen;
  const props = [];
  const propEnd = off + propLen;
  for (let i = 0; i < numProps; i++) { const r = readProp(dv, u8, off); props.push(r.prop); off = r.off; }
  off = propEnd;
  const nodes = [];
  if (off < endOffset) {
    const sentinel = big ? 25 : 13;
    while (off < endOffset - sentinel) {
      const r = readNode(dv, u8, off, big);
      if (!r) break;
      nodes.push(r.node); off = r.off;
    }
  }
  return { node: { name, props, nodes }, off: endOffset };
}

export function parse(buffer) {
  const dv = new DataView(buffer), u8 = new Uint8Array(buffer);
  if (latin(u8, 0, 20) !== MAGIC) throw new Error("Not a binary FBX file. Export from Blender or Maya with binary FBX.");
  const version = dv.getUint32(23, true);
  const big = version >= 7500;
  const root = { name: "", props: [], nodes: [] };
  let off = 27;
  while (off < buffer.byteLength - (big ? 25 : 13)) {
    const r = readNode(dv, u8, off, big);
    if (!r) break;
    root.nodes.push(r.node); off = r.off;
  }
  return { version, root };
}

/* ---------- writer ---------- */

class Writer {
  constructor() { this.buf = new Uint8Array(1 << 20); this.len = 0; }
  need(n) {
    if (this.len + n <= this.buf.length) return;
    let cap = this.buf.length;
    while (cap < this.len + n) cap *= 2;
    const next = new Uint8Array(cap);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }
  bytes(b) { this.need(b.length); this.buf.set(b, this.len); this.len += b.length; }
  u8(v) { this.need(1); this.buf[this.len++] = v & 0xff; }
  view(n) { this.need(n); const dv = new DataView(this.buf.buffer, this.len, n); this.len += n; return dv; }
  u32(v) { this.view(4).setUint32(0, v, true); }
  i32(v) { this.view(4).setInt32(0, v, true); }
  i16(v) { this.view(2).setInt16(0, v, true); }
  f32(v) { this.view(4).setFloat32(0, v, true); }
  f64(v) { this.view(8).setFloat64(0, v, true); }
  i64(v) { this.view(8).setBigInt64(0, BigInt(v), true); }
  u64(v) { this.view(8).setBigUint64(0, BigInt(v), true); }
  patch(pos, v, big) {
    const dv = new DataView(this.buf.buffer, pos, big ? 8 : 4);
    if (big) dv.setBigUint64(0, BigInt(v), true); else dv.setUint32(0, v, true);
  }
  out() { return this.buf.slice(0, this.len).buffer; }
}

function writeProp(w, p) {
  w.u8(p.t.charCodeAt(0));
  switch (p.t) {
    case "Y": return w.i16(p.v);
    case "C": return w.u8(p.v ? 1 : 0);
    case "I": return w.i32(p.v);
    case "F": return w.f32(p.v);
    case "D": return w.f64(p.v);
    case "L": return w.i64(p.v);
    case "S":
    case "R": { w.u32(p.v.length); return w.bytes(p.v); }
    default: {
      const a = p.v;
      w.u32(a.length); w.u32(0); w.u32(a.byteLength);
      return w.bytes(new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
    }
  }
}

function writeNull(w, big) { const n = big ? 25 : 13; w.bytes(new Uint8Array(n)); }

function writeNode(w, node, big) {
  const head = w.len;
  if (big) { w.u64(0); w.u64(node.props.length); w.u64(0); } else { w.u32(0); w.u32(node.props.length); w.u32(0); }
  const nameBytes = strToBytes(node.name);
  w.u8(nameBytes.length); w.bytes(nameBytes);
  const propStart = w.len;
  for (const p of node.props) writeProp(w, p);
  const propLen = w.len - propStart;
  if (node.nodes.length) { for (const c of node.nodes) writeNode(w, c, big); writeNull(w, big); }
  w.patch(head, w.len, big);
  w.patch(head + (big ? 16 : 8), propLen, big);
}

export function serialize(doc) {
  const big = doc.version >= 7500;
  const w = new Writer();
  w.bytes(strToBytes(MAGIC)); w.u8(0x00); w.u8(0x1a); w.u8(0x00); w.u32(doc.version);
  for (const n of doc.root.nodes) writeNode(w, n, big);
  writeNull(w, big);
  w.bytes(new Uint8Array(16));
  while (w.len % 16 !== 0) w.u8(0);
  w.bytes(new Uint8Array(4));
  w.u32(doc.version);
  w.bytes(new Uint8Array(120));
  w.bytes(new Uint8Array(FOOTER_MAGIC));
  return w.out();
}

/* ---------- traversal helpers ---------- */

const child = (n, name) => (n ? n.nodes.find(c => c.name === name) : null);
const kids = (n, name) => (n ? n.nodes.filter(c => c.name === name) : []);
const pStr = (n, i) => (n && n.props[i] ? bytesToStr(n.props[i].v) : "");
function objName(n) { return pStr(n, 1).split("\u0000\u0001")[0]; }
function setChildStr(parent, name, value) {
  let c = child(parent, name);
  if (!c) { c = { name, props: [{ t: "S", v: strToBytes(value) }], nodes: [] }; parent.nodes.push(c); }
  else c.props[0] = { t: "S", v: strToBytes(value) };
}

function polygons(indices) {
  const out = [];
  let cur = [];
  for (let i = 0; i < indices.length; i++) {
    let v = indices[i];
    const last = v < 0;
    if (last) v = ~v;
    cur.push({ vi: v, pv: i });
    if (last) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out;
}

function uvLayer(geo) {
  const layer = child(geo, "LayerElementUV");
  if (!layer) return null;
  const uv = child(layer, "UV"), idx = child(layer, "UVIndex");
  if (!uv) return null;
  return {
    layer,
    uv: uv.props[0].v,
    index: idx ? idx.props[0].v : null,
    mapping: pStr(child(layer, "MappingInformationType"), 0),
    reference: pStr(child(layer, "ReferenceInformationType"), 0)
  };
}

function matLayer(geo) {
  const layer = child(geo, "LayerElementMaterial");
  if (!layer) return null;
  const m = child(layer, "Materials");
  return { layer, data: m ? m.props[0].v : null, mapping: pStr(child(layer, "MappingInformationType"), 0) };
}

/* ---------- inspection ---------- */

export function inspect(doc) {
  const objects = child(doc.root, "Objects");
  const connections = child(doc.root, "Connections");
  if (!objects) throw new Error("FBX has no Objects section");
  const geos = kids(objects, "Geometry").filter(g => pStr(g, 2) === "Mesh");
  const mats = kids(objects, "Material");
  const models = kids(objects, "Model");
  const edges = kids(connections, "C").map(c => ({ kind: pStr(c, 0), childId: c.props[1].v, parentId: c.props[2].v, node: c }));

  const matById = new Map(mats.map(m => [m.props[0].v, m]));
  const meshes = [];
  for (const geo of geos) {
    const gid = geo.props[0].v;
    const modelIds = edges.filter(e => e.childId === gid).map(e => e.parentId);
    const materialIds = [];
    for (const mid of modelIds) {
      for (const e of edges) {
        if (e.parentId === mid && matById.has(e.childId) && materialIds.indexOf(e.childId) < 0) materialIds.push(e.childId);
      }
    }
    const model = models.find(m => modelIds.indexOf(m.props[0].v) >= 0);
    const pvi = child(geo, "PolygonVertexIndex");
    meshes.push({
      id: gid,
      name: objName(geo) || (model ? objName(model) : "mesh"),
      modelName: model ? objName(model) : "",
      polyCount: pvi ? polygons(pvi.props[0].v).length : 0,
      materialIds
    });
  }

  const used = new Set();
  meshes.forEach(m => m.materialIds.forEach(id => used.add(id)));
  const materials = mats.filter(m => used.has(m.props[0].v)).map(m => ({ id: m.props[0].v, name: objName(m) }));
  if (!materials.length) mats.forEach(m => materials.push({ id: m.props[0].v, name: objName(m) }));

  let outOfRange = 0;
  for (const geo of geos) {
    const uvl = uvLayer(geo);
    if (!uvl) continue;
    for (let i = 0; i < uvl.uv.length; i++) { const t = uvl.uv[i]; if (t < -0.001 || t > 1.001) outOfRange++; }
  }
  return { version: doc.version, meshes, materials, outOfRange };
}

/* Triangulated preview data. Positions are model-space, per triangle we keep
   the local material slot index so the viewer can colour zones. */
export function previewMesh(doc) {
  const objects = child(doc.root, "Objects");
  const geos = kids(objects, "Geometry").filter(g => pStr(g, 2) === "Mesh");
  const info = inspect(doc);
  const pos = [], uvs = [], matIdx = [];
  geos.forEach((geo, gi) => {
    const verts = child(geo, "Vertices"), pviNode = child(geo, "PolygonVertexIndex");
    if (!verts || !pviNode) return;
    const V = verts.props[0].v, polys = polygons(pviNode.props[0].v);
    const uvl = uvLayer(geo), ml = matLayer(geo);
    const meshInfo = info.meshes[gi] || { materialIds: [] };
    const readUV = (p) => {
      if (!uvl) return [0, 0];
      let i;
      if (uvl.mapping === "ByVertice" || uvl.mapping === "ByVertex") i = p.vi;
      else i = p.pv;
      if (uvl.index) i = uvl.index[i];
      return [uvl.uv[i * 2] || 0, uvl.uv[i * 2 + 1] || 0];
    };
    polys.forEach((poly, pi) => {
      let slot = 0;
      if (ml && ml.data) slot = ml.mapping === "AllSame" ? ml.data[0] : (ml.data[pi] || 0);
      const globalSlot = info.materials.findIndex(m => m.id === meshInfo.materialIds[slot]);
      for (let k = 1; k < poly.length - 1; k++) {
        for (const p of [poly[0], poly[k], poly[k + 1]]) {
          pos.push(V[p.vi * 3], V[p.vi * 3 + 1], V[p.vi * 3 + 2]);
          const t = readUV(p);
          uvs.push(t[0], t[1]);
        }
        matIdx.push(globalSlot < 0 ? 0 : globalSlot);
      }
    });
  });
  return { positions: new Float32Array(pos), uvs: new Float32Array(uvs), triMaterial: matIdx };
}

/* ---------- atlas remap ----------
   rects: Map materialId -> { u0, v0, du, dv, rot }  (UV space, v from bottom)
   Rewrites every UV layer as Direct / ByPolygonVertex, collapses each mesh to a
   single material slot, and renames the surviving material. */
export function applyAtlas(doc, rects, atlasName) {
  const objects = child(doc.root, "Objects");
  const connections = child(doc.root, "Connections");
  const geos = kids(objects, "Geometry").filter(g => pStr(g, 2) === "Mesh");
  const info = inspect(doc);
  let remapped = 0, skipped = 0;

  geos.forEach((geo, gi) => {
    const pviNode = child(geo, "PolygonVertexIndex");
    const uvl = uvLayer(geo);
    if (!pviNode || !uvl) { skipped++; return; }
    const polys = polygons(pviNode.props[0].v);
    const ml = matLayer(geo);
    const meshInfo = info.meshes[gi] || { materialIds: [] };
    const out = new Float64Array(pviNode.props[0].v.length * 2);
    polys.forEach((poly, pi) => {
      let slot = 0;
      if (ml && ml.data) slot = ml.mapping === "AllSame" ? ml.data[0] : (ml.data[pi] || 0);
      const r = rects.get(meshInfo.materialIds[slot]) || { u0: 0, v0: 0, du: 1, dv: 1, rot: 0 };
      for (const p of poly) {
        let i;
        if (uvl.mapping === "ByVertice" || uvl.mapping === "ByVertex") i = p.vi; else i = p.pv;
        if (uvl.index) i = uvl.index[i];
        let u = uvl.uv[i * 2], v = uvl.uv[i * 2 + 1];
        if (!isFinite(u)) u = 0;
        if (!isFinite(v)) v = 0;
        u = u < 0 ? 0 : u > 1 ? 1 : u;
        v = v < 0 ? 0 : v > 1 ? 1 : v;
        const nu = r.rot ? r.u0 + v * r.du : r.u0 + u * r.du;
        const nv = r.rot ? r.v0 + (1 - u) * r.dv : r.v0 + v * r.dv;
        out[p.pv * 2] = nu;
        out[p.pv * 2 + 1] = nv;
      }
      remapped++;
    });
    child(uvl.layer, "UV").props[0] = { t: "d", v: out };
    uvl.layer.nodes = uvl.layer.nodes.filter(n => n.name !== "UVIndex");
    setChildStr(uvl.layer, "MappingInformationType", "ByPolygonVertex");
    setChildStr(uvl.layer, "ReferenceInformationType", "Direct");
    if (ml) {
      const m = child(ml.layer, "Materials");
      if (m) m.props[0] = { t: "i", v: new Int32Array([0]) };
      setChildStr(ml.layer, "MappingInformationType", "AllSame");
      setChildStr(ml.layer, "ReferenceInformationType", "IndexToDirect");
    }
  });

  // collapse material slots: keep the first material per model, drop the rest
  const keep = new Set();
  const mats = kids(objects, "Material");
  const matIds = new Set(mats.map(m => m.props[0].v));
  const edges = kids(connections, "C");
  const byParent = new Map();
  edges.forEach(c => {
    const cid = c.props[1].v, pid = c.props[2].v;
    if (!matIds.has(cid)) return;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push({ node: c, id: cid });
  });
  byParent.forEach(list => keep.add(list[0].id));
  if (keep.size) {
    const drop = new Set();
    byParent.forEach(list => list.forEach(e => { if (!keep.has(e.id)) drop.add(e.id); }));
    keep.forEach(id => drop.delete(id));
    connections.nodes = connections.nodes.filter(c => !(c.name === "C" && drop.has(c.props[1].v)));
    objects.nodes = objects.nodes.filter(n => !(n.name === "Material" && drop.has(n.props[0].v)));
    if (atlasName) {
      mats.forEach(m => {
        if (!keep.has(m.props[0].v)) return;
        const parts = pStr(m, 1).split("\u0000\u0001");
        m.props[1] = { t: "S", v: strToBytes(atlasName + "\u0000\u0001" + (parts[1] || "Material")) };
      });
    }
  }
  return { remapped, skipped, materialSlots: keep.size };
}
