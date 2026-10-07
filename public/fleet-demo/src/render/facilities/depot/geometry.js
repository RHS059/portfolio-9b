/** Original, opaque diagram geometry. No DOM, texture, asset fetch or global THREE. */
export const FACILITY_THEME = Object.freeze({
  paper: 0xf7f7f2, face: 0xdedfd9, ink: 0x303735, muted: 0x929b95,
  ground: 0xe9ebe5, dark: 0x525b55,
});

// Bay and process markings use strokes without fonts or textures.
const GLYPHS = {
  A: ['040110203134','0232'], B: ['0004','002031312202','022233332404'],
  C: ['3020100103142434'], D: ['0004','00203133342404'], E: ['3000000434','0232'],
  F: ['04000030','0232'], G: ['30201001031424343222'], H: ['0004','3034','0232'],
  I: ['0030','1014','0434'], J: ['0030','3033241403'], K: ['0004','300234'],
  L: ['000434'], M: ['040012223034'], N: ['04003430'], O: ['10000103142433313010'],
  P: ['04000020313202'], Q: ['10000103142433313010','2234'], R: ['04000020313202','1234'],
  S: ['302010010212223333241404'], T: ['0030','1014'], U: ['000314243330'],
  V: ['001430'], W: ['000414223430'], X: ['0034','3004'], Y: ['001230','1214'],
  Z: ['00300434'], '0': ['10000103142433313010','0331'], '1': ['011014','0434'],
  '2': ['00002031320434'], '3': ['00303222','22333404'], '4': ['000232','3034'],
  '5': ['30000222333404'], '6': ['30000434322202'], '7': ['003014'],
  '8': ['10000103142433313010','0232'], '9': ['3430000232'], '/': ['0430'],
  '-': ['0232'], '.': ['1414'], ':': ['1111','1313'],
};

/** All geometry is merged by material, keeping a detailed building to a few draws. */
export function createDiagramBuilder(THREE) {
  const T = THREE, buckets = new Map(), outlines = [], strokes = [];
  function box(width, depth, height, x, y, z, tone = 'paper', edge = true) {
    const indexed = new T.BoxGeometry(width, depth, height);
    indexed.translate(x, y, z);
    if (edge) {
      const edges = new T.EdgesGeometry(indexed, 25);
      outlines.push(...edges.getAttribute('position').array);
      edges.dispose();
    }
    const geometry = indexed.toNonIndexed();
    const bucket = buckets.get(tone) || { positions: [], normals: [] };
    bucket.positions.push(...geometry.getAttribute('position').array);
    bucket.normals.push(...geometry.getAttribute('normal').array);
    buckets.set(tone, bucket);
    geometry.dispose(); indexed.dispose();
  }
  function line(points) {
    for (let i = 1; i < points.length; i++) strokes.push(...points[i - 1], ...points[i]);
  }
  function rectangle(x, y, width, depth, z = 0.04) {
    line([[x-width/2,y-depth/2,z],[x+width/2,y-depth/2,z],[x+width/2,y+depth/2,z],[x-width/2,y+depth/2,z],[x-width/2,y-depth/2,z]]);
  }
  function text(value, x, y, z, size = 1) {
    const chars = value.toUpperCase();
    const origin = x - ((chars.length * 4 - 1) * size) / 2;
    [...chars].forEach((char, i) => {
      for (const path of GLYPHS[char] || []) {
        const points = [];
        for (let k = 0; k < path.length; k += 2) points.push([origin + (i * 4 + Number(path[k])) * size, y + (4 - Number(path[k + 1])) * size, z]);
        line(points);
      }
    });
  }
  function finish(name) {
    const group = new T.Group(); group.name = name;
    for (const [tone, bucket] of buckets) {
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(bucket.positions, 3));
      geometry.setAttribute('normal', new T.Float32BufferAttribute(bucket.normals, 3));
      geometry.computeBoundingSphere();
      const material = new T.MeshLambertMaterial({ color: FACILITY_THEME[tone], polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      const mesh = new T.Mesh(geometry, material); mesh.name = name + '-' + tone; group.add(mesh);
    }
    for (const [suffix, positions] of [['edges', outlines], ['markings', strokes]]) {
      if (!positions.length) continue;
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      geometry.computeBoundingSphere();
      const lines = new T.LineSegments(geometry, new T.LineBasicMaterial({ color: FACILITY_THEME.ink }));
      lines.name = name + '-' + suffix; group.add(lines);
    }
    return group;
  }
  return { box, line, rectangle, text, finish };
}
