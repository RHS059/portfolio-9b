/* =============================================================================
   fleet-geometry.js — low-poly fleet geometry: vehicles, forklift, crate, person
   -----------------------------------------------------------------------------
   Extracted from Fleet Console. Self-contained: pass in a three.js namespace,
   get back every geometry plus the metadata describing how they assemble.

     const lib = buildFleetGeometry(THREE);

   -----------------------------------------------------------------------------
   COORDINATE CONVENTION
   -----------------------------------------------------------------------------
   Right-handed, Z-up (MapLibre custom-layer convention, not three.js default):

       +Y = forward (direction of travel)      +X = vehicle's right
       +Z = up                                  origin = ground level, on the
                                                centreline, at the part-join

   Units are metres. A car is ~1.9 m wide and ~4.6 m long; a semi tractor with
   trailer spans ~22 m. Every part is authored in the SAME vehicle-local frame,
   so parts from different variants line up without transforms.

   -----------------------------------------------------------------------------
   THE FOUR-SLOT SYSTEM
   -----------------------------------------------------------------------------
   Each vehicle type has four independent slots, 10 variants each:

       w  wheels     tyre + rim + hub, one geometry reused at every axle
       f  front      bonnet/nose/grille + headlights
       c  cabin      passenger compartment + glass
       b  back       boot / bed / box / trailer + tail lights

   A vehicle is one random index per slot: 10 x 10 x 10 x 10 = 10,000 possible
   silhouettes per type. Because the slots occupy disjoint Y ranges, any
   combination is watertight — a sports nose can carry an SUV roof and a pickup
   bed. Y ranges per type:

       car    front  0.8 .. 2.3     cabin -1.2 .. 0.8    back -2.3 .. -1.2
       van    front  1.3 .. 3.3     cabin -0.5 .. 1.3    back -3.2 .. -0.5
       truck  front  7.4 .. 9.0     cabin  5.6 .. 7.4    back = trailer, hitched

   The truck's "back" slot is a full trailer that pivots independently at the
   hitch (see ASSEMBLY below), so its geometry is authored around its OWN
   origin, extending into -Y from the kingpin.

   -----------------------------------------------------------------------------
   PART DESCRIPTOR FORMAT
   -----------------------------------------------------------------------------
   A part is built from a list of primitives. Each entry is:

       [geometry, x, y, z, colour, rotateZ?]

   `colour` is either a hex number (fixed trim: glass, chrome, rubber, wood) or
   the sentinel 'P' meaning PAINT — that primitive takes the vehicle's livery
   colour at render time. This is baked into the merged geometry as a per-vertex
   `tint` attribute (1 = paint, 0 = fixed), so one instanced draw call can carry
   2,400 differently-coloured vehicles while keeping glass dark and chrome
   bright. See PAINT SHADER below.

   ============================================================================= */

function buildFleetGeometry(THREE) {
  const T = THREE;
  const B = (w, l, h) => new T.BoxGeometry(w, l, h);
  const C = (r, h, n) => new T.CylinderGeometry(r, r, h, n || 12);
  const RZ = Math.PI / 2, RX = Math.PI / 2;

  // ---- palette -------------------------------------------------------------
  const P = 'P',              // takes the vehicle's paint colour
    GLASS  = 0x0f1a22,
    DARK   = 0x111416,
    LIGHT  = 0xe8ecea,
    HL     = 0xfff1b8,        // headlight
    TL     = 0xff3b30,        // tail light
    CHROME = 0xd8dde0,
    WOOD   = 0x9c6b3c,
    WOOD2  = 0x7a4f2a,
    STEEL  = 0x6b7378,
    TANK   = 0xc9cfd2,
    YEL    = 0xf2b418;

  /* ---------------------------------------------------------------------------
     MERGE: primitives -> one BufferGeometry
     Bakes position/normal/colour and the `tint` flag. Non-indexed so the merge
     is a straight concatenation; each part becomes exactly one draw.
     ------------------------------------------------------------------------- */
  function partsGeometry(parts) {
    const pos = [], nor = [], col = [], tnt = [];
    parts.forEach(([geo, x, y, z, c, rz]) => {
      const g = geo.toNonIndexed();
      const m = new T.Matrix4().makeTranslation(x, y, z);
      if (rz) m.multiply(new T.Matrix4().makeRotationZ(rz));
      g.applyMatrix4(m);
      const p = g.attributes.position.array, n = g.attributes.normal.array;
      const cc = new T.Color(c === 'P' ? 0xffffff : c), t = c === 'P' ? 1 : 0;
      for (let i = 0; i < p.length; i += 3) {
        pos.push(p[i], p[i + 1], p[i + 2]);
        nor.push(n[i], n[i + 1], n[i + 2]);
        col.push(cc.r, cc.g, cc.b);
        tnt.push(t);
      }
      g.dispose();
    });
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    out.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    out.setAttribute('tint', new T.Float32BufferAttribute(tnt, 1));
    return out;
  }
  const G = parts => partsGeometry(parts);

  // ---- lamp helpers: slim bar, boxy pod, or round pair --------------------
  const RC = (r, h, n) => { const g = C(r, h, n); g.rotateX(RX); return g; };
  const lamps = (y, z, kind, c, half) => kind === 'slim'
    ? [[B(0.5, 0.06, 0.1), half, y, z, c], [B(0.5, 0.06, 0.1), -half, y, z, c]]
    : [[B(0.36, 0.06, 0.2), half, y, z, c], [B(0.36, 0.06, 0.2), -half, y, z, c]];
  const rlamps = (y, z, c, half) =>
    [[RC(0.14, 0.06, 10), half, y, z, c], [RC(0.14, 0.06, 10), -half, y, z, c]];
  const lampset = (kind, y, z, c, half) =>
    kind === 'round' ? rlamps(y, z, c, half) : lamps(y, z, kind, c, half);

  /* =========================================================================
     CAR — width 1.9
     ========================================================================= */

  // [bonnet height, lamp style, extra feature]
  const carFront = [
    [0.72, 'slim',  'lip'  ], [0.90, 'box',   null   ], [1.20, 'box',  'bar'  ],
    [1.25, 'box',   'bull' ], [0.95, 'slim',  null   ], [0.80, 'slim', 'lip'  ],
    [0.95, 'box',   null   ], [1.10, 'slim',  null   ], [0.90, 'round','scoop'],
    [1.00, 'round', null   ]
  ].map(([h, lamp, extra]) => {
    const p = [
      [B(1.9, 1.5, h - 0.35), 0, 1.55, (h + 0.35) / 2, P],   // bonnet
      [B(1.95, 0.2, 0.28),    0, 2.22, 0.5,  DARK],          // bumper
      [B(0.9, 0.06, 0.18),    0, 2.33, 0.66, DARK],          // grille
      ...lampset(lamp, 2.33, h - 0.16, HL, 0.62)             // headlights
    ];
    if (extra === 'lip')   p.push([B(1.9, 0.3, 0.08), 0, 2.2, 0.38, DARK]);
    if (extra === 'bar')   p.push([B(1.3, 0.16, 0.1), 0, 1.6, h + 0.05, DARK]);
    if (extra === 'bull')  p.push([B(1.7, 0.1, 0.5),  0, 2.4, 0.75, CHROME]);
    if (extra === 'scoop') p.push([B(0.6, 0.6, 0.12), 0, 1.3, h + 0.05, P]);
    return G(p);
  });

  // [roof height, glass length, glass Y offset, kind]
  const carCabin = [
    [1.25, 1.6, 0,    'glass'], [1.45, 1.9, 0,    'glass'],
    [1.85, 2.0, 0,    'glass'], [1.80, 1.3, 0.3,  'glass'],
    [1.55, 1.9, 0,    'glass'], [1.05, 0.7, 0.55, 'open' ],
    [1.35, 1.9, 0,    'targa'], [1.90, 2.0, 0,    'glass'],
    [1.55, 2.0, 0,    'glass'], [1.60, 1.7, 0,    'glass']
  ].map(([H, len, yo, kind]) => {
    const p = [
      [B(1.9, 2.0, 0.55), 0, -0.2, 0.625, P],          // body sides
      [B(0.2, 2.0, 0.08), 0.96, -0.2, 0.9, DARK],      // sill R
      [B(0.2, 2.0, 0.08), -0.96, -0.2, 0.9, DARK]      // sill L
    ];
    if (kind === 'open') {                              // roadster / convertible
      p.push(
        [B(1.7, 0.1, 0.5),   0, 0.6, 1.1, GLASS],       // windscreen
        [B(0.5, 0.5, 0.45),  0.45, -0.2, 1.1, DARK],    // seat R
        [B(0.5, 0.5, 0.45), -0.45, -0.2, 1.1, DARK],    // seat L
        [B(1.9, 0.6, 0.3),   0, -0.9, 1.0, P]           // rear deck
      );
    } else {
      const gy = -0.2 + yo;
      p.push(
        [B(1.72, len, H - 0.9), 0, gy, (H + 0.9) / 2, GLASS],
        [B(1.78, len * (kind === 'targa' ? 0.35 : 0.62), 0.08),
          0, gy + (kind === 'targa' ? -len * 0.3 : 0), H, P],           // roof
        [B(1.8, 0.1, H - 0.9), 0, gy + len / 2 - 0.05, (H + 0.9) / 2, P], // A-pillar
        [B(1.8, 0.1, H - 0.9), 0, gy - len / 2 + 0.05, (H + 0.9) / 2, P]  // C-pillar
      );
    }
    return G(p);
  });

  // [height, kind, lamp style]
  const carBack = [
    [0.95, 'trunk',   'slim' ], [1.00, 'trunk',   'box'  ],
    [1.80, 'box',     'box'  ], [1.10, 'bed',     'box'  ],
    [1.45, 'hatch',   'slim' ], [0.85, 'spoiler', 'slim' ],
    [1.50, 'wagon',   'box'  ], [1.85, 'box',     'slim' ],
    [0.95, 'spoiler', 'round'], [1.40, 'hatch',   'box'  ]
  ].map(([H, kind, lamp]) => {
    const p = [
      [B(1.9, 1.1, kind === 'bed' ? 0.55 : H - 0.35),
        0, -1.75, kind === 'bed' ? 0.625 : (H + 0.35) / 2, P],
      [B(1.95, 0.2, 0.28), 0, -2.22, 0.5, DARK],                    // bumper
      ...lampset(lamp, -2.33, Math.min(H, 1.4) - 0.16, TL, 0.62)    // tail lights
    ];
    if (kind === 'box' || kind === 'wagon' || kind === 'hatch')
      p.push([B(1.7, 0.06, H - 1.0), 0, -2.3, (H + 1.0) / 2 - 0.05, GLASS]);
    if (kind === 'bed')                                             // pickup tub
      p.push(
        [B(0.12, 1.1, 0.5),  0.89, -1.75, 1.15, P],
        [B(0.12, 1.1, 0.5), -0.89, -1.75, 1.15, P],
        [B(1.9, 0.1, 0.5),   0, -2.25, 1.15, P],
        [B(1.6, 0.9, 0.3),   0, -1.7,  1.05, WOOD]                  // bed liner
      );
    if (kind === 'spoiler')
      p.push(
        [B(1.6, 0.25, 0.06), 0, -2.15, H + 0.18, DARK],
        [B(0.08, 0.2, 0.2),  0.6, -2.15, H + 0.06, DARK],
        [B(0.08, 0.2, 0.2), -0.6, -2.15, H + 0.06, DARK]
      );
    return G(p);
  });

  /* =========================================================================
     VAN — width 2.0
     ========================================================================= */

  // [nose height, flat-front?, lamp style]
  const vanFront = [
    [1.00, false, 'box'  ], [1.15, false, 'box'  ], [2.10, true,  'box'  ],
    [2.30, true,  'slim' ], [1.10, false, 'round'], [1.25, false, 'slim' ],
    [2.00, true,  'round'], [1.05, false, 'box'  ], [1.90, true,  'slim' ],
    [1.20, false, 'box'  ]
  ].map(([h, flat, lamp]) => {
    const p = [
      [B(2.0, 2.0, h - 0.35), 0, 2.3, (h + 0.35) / 2, P],
      [B(2.05, 0.2, 0.3),     0, 3.22, 0.5, DARK],
      ...lampset(lamp, 3.33, Math.min(h, 1.5) - 0.2, HL, 0.68)
    ];
    // flat = cab-over: the windscreen is the front face. Otherwise a grille.
    if (flat) p.push([B(1.9, 0.06, 0.9), 0, 3.32, h - 0.55, GLASS]);
    else      p.push([B(1.2, 0.06, 0.24), 0, 3.32, 0.72, DARK]);
    return G(p);
  });

  const vanCabin = [1.9, 2.1, 2.35, 2.0, 2.5, 1.8, 2.2, 2.05, 2.6, 1.95].map(H => G([
    [B(2.0, 1.8, H - 0.35), 0, 0.4, (H + 0.35) / 2, P],
    [B(1.9, 0.08, H * 0.42), 0, 1.3, H * 0.66, GLASS],        // windscreen
    [B(0.06, 0.9, H * 0.34),  1.0, 0.5, H * 0.68, GLASS],     // door glass R
    [B(0.06, 0.9, H * 0.34), -1.0, 0.5, H * 0.68, GLASS]      // door glass L
  ]));

  // [height, kind]  box | cube | reefer | window | flat | bed | step | stake
  const vanBack = [
    [1.90, 'box'   ], [2.35, 'box'   ], [2.50, 'cube' ], [2.40, 'reefer'],
    [1.90, 'window'], [0.90, 'flat'  ], [1.10, 'bed'  ], [2.60, 'step'  ],
    [2.10, 'window'], [1.50, 'stake' ]
  ].map(([H, kind]) => {
    const p = [
      [B(2.05, 0.2, 0.3), 0, -3.12, 0.5, DARK],
      [B(0.3, 0.06, 0.2),  0.8, -3.23, 1.0, TL],
      [B(0.3, 0.06, 0.2), -0.8, -3.23, 1.0, TL]
    ];
    if (kind === 'flat') {
      p.push([B(2.0, 2.7, 0.5), 0, -1.85, 0.6, P],
             [B(2.1, 2.7, 0.08), 0, -1.85, 0.9, WOOD]);
    } else if (kind === 'bed') {
      p.push(
        [B(2.0, 2.7, 0.55), 0, -1.85, 0.625, P],
        [B(0.12, 2.7, 0.5),  0.94, -1.85, 1.15, P],
        [B(0.12, 2.7, 0.5), -0.94, -1.85, 1.15, P],
        [B(2.0, 0.1, 0.5), 0, -3.15, 1.15, P],
        [B(0.9, 0.9, 0.9),  0.3, -1.6, 1.35, WOOD],           // cargo crates
        [B(0.7, 0.7, 0.7), -0.5, -2.4, 1.25, WOOD2]
      );
    } else if (kind === 'stake') {
      p.push([B(2.0, 2.7, 0.5), 0, -1.85, 0.6, P],
        ...[-2.9, -1.85, -0.8].flatMap(y => [
          [B(0.08, 0.08, H - 0.85),  0.98, y, (H + 0.85) / 2, WOOD],
          [B(0.08, 0.08, H - 0.85), -0.98, y, (H + 0.85) / 2, WOOD]
        ]),
        [B(0.04, 2.6, 0.12),  1.0, -1.85, H - 0.2, WOOD],     // top rails
        [B(0.04, 2.6, 0.12), -1.0, -1.85, H - 0.2, WOOD]
      );
    } else {
      const wide = kind === 'cube' || kind === 'reefer' || kind === 'step';
      const w = wide ? 2.3 : 2.0;
      const col = kind === 'cube' || kind === 'reefer' ? LIGHT : P;
      p.push([B(w, 2.7, H - 0.35), 0, -1.85, (H + 0.35) / 2, col]);
      if (kind === 'window') p.push([B(w + 0.04, 2.2, 0.55), 0, -1.7, H - 0.6, GLASS]);
      if (kind === 'reefer') p.push([B(1.6, 0.35, 0.9), 0, -0.4, H - 0.6, STEEL]);  // chiller
      if (kind === 'cube' || kind === 'reefer')
        p.push([B(w - 0.3, 0.06, H - 0.9), 0, -3.21, (H + 0.7) / 2, STEEL]);        // roll door
    }
    return G(p);
  });

  /* =========================================================================
     TRUCK — width 2.5. Tractor chassis spans Y 4.4 .. 9.0; the hitch
     (kingpin) is at the origin, and the trailer hangs into -Y from there.
     ========================================================================= */

  // [bonnet height, bonnet length, lamp style]   length < 0.8 => cab-over
  const cabFront = [
    [2.2, 1.6, 'box'  ], [2.0, 1.2, 'round'], [3.6, 0.6, 'box' ],
    [2.4, 1.8, 'box'  ], [2.1, 1.4, 'slim' ], [3.8, 0.6, 'slim'],
    [2.3, 1.6, 'round'], [1.9, 1.0, 'box'  ], [2.5, 1.7, 'slim'],
    [3.5, 0.6, 'box'  ]
  ].map(([h, len, lamp]) => {
    const flat = len < 0.8, y0 = 9.0 - len / 2;
    const p = [
      [B(2.5, len, h - 0.7), 0, y0, (h + 0.7) / 2, P],            // bonnet
      [B(2.4, 2.4, 0.9),     0, 6.0, 0.9, DARK],                  // chassis rail
      [B(2.6, 0.25, 0.5),    0, 8.95, 0.7, CHROME],               // bumper
      [B(1.6, 0.06, 0.7),    0, 9.02, flat ? 1.4 : h - 0.75, CHROME],  // grille
      ...lampset(lamp, 9.03, flat ? 1.9 : h - 0.3, HL, 0.9)
    ];
    if (flat) p.push([B(2.3, 0.06, 1.1), 0, 9.02, h - 0.75, GLASS]);
    if (!flat && len > 1.5) p.push([C(0.14, 0.9, 8), 1.05, 7.7, h + 0.4, CHROME]);
    return G(p);
  });

  // [roof height, sleeper length (0 = day cab), roof fairing?]
  const cabCabin = [
    [3.4, 0,   false], [3.6, 1.0, false], [3.9, 1.2, true ],
    [3.3, 0,   false], [3.7, 0.8, true ], [3.5, 0,   false],
    [3.8, 1.4, false], [3.4, 0.6, false], [4.0, 1.2, true ],
    [3.6, 0,   true ]
  ].map(([H, sleeper, fairing]) => {
    const p = [
      [B(2.5, 1.8, H - 0.9), 0, 6.5, (H + 0.9) / 2, P],
      [B(2.3, 0.06, 1.0),    0, 7.42, H - 0.8, GLASS],            // windscreen
      [B(0.06, 0.8, 0.8),  1.26, 6.7, H - 0.85, GLASS],           // door glass
      [B(0.06, 0.8, 0.8), -1.26, 6.7, H - 0.85, GLASS],
      [B(0.1, 0.5, 0.06),  1.3, 6.9, 0.95, CHROME],               // steps
      [B(0.1, 0.5, 0.06), -1.3, 6.9, 0.95, CHROME]
    ];
    if (sleeper) p.push([B(2.5, sleeper, H - 0.9), 0, 5.6 - sleeper / 2, (H + 0.9) / 2, P]);
    if (fairing) p.push([B(2.4, 1.6, 0.5), 0, 6.5, H + 0.2, P]);
    p.push([C(0.12, 1.2, 8), 1.1, 5.5, H - 0.3, CHROME]);         // exhaust stack
    return G(p);
  });

  // trailer bodies: box shell / open flatbed deck
  const tr = (len, H, col) => [
    [B(2.6, len, H - 1.2), 0, -len / 2 - 0.2, (H + 1.2) / 2, col],
    [B(2.6, len, 0.5),     0, -len / 2 - 0.2, 0.55, DARK],        // bogie frame
    [B(2.5, 0.06, 0.2),    0, -len - 0.23, 1.0, TL]
  ];
  const flatbed = len => [
    [B(2.6, len, 0.25), 0, -len / 2 - 0.2, 1.05, WOOD],           // deck
    [B(2.6, len, 0.5),  0, -len / 2 - 0.2, 0.55, DARK]
  ];

  const trailer = [
    G(tr(13.4, 4.1, LIGHT)),                                       // 0 dry van
    G([...flatbed(13.4),                                           // 1 crated freight
      [B(1.4, 1.4, 1.4),  0.5, -2.5,  1.9, WOOD],
      [B(1.2, 1.2, 1.2), -0.6, -5.0,  1.8, WOOD2],
      [B(1.4, 2.0, 1.0),  0.2, -8.5,  1.7, WOOD],
      [B(1.0, 1.0, 1.0), -0.7, -11.5, 1.7, WOOD2]]),
    G([[C(1.2, 12.0, 14), 0, -6.9, 2.5, TANK, RZ],                 // 2 tanker
      [B(2.6, 12.5, 0.5), 0, -6.4, 0.55, DARK],
      [B(0.6, 1.2, 0.3),  0, -6.9, 3.85, STEEL],
      [B(2.5, 0.06, 0.2), 0, -13.03, 1.0, TL]]),
    G([...tr(13.4, 4.1, LIGHT),                                    // 3 reefer
      [B(2.2, 0.6, 1.4), 0, 0.1, 3.2, STEEL]]),
    G([...tr(13.4, 3.9, P),                                        // 4 liveried van
      [B(2.7, 12.6, 0.15), 0, -6.9, 1.35, DARK],
      [B(2.7, 12.6, 0.15), 0, -6.9, 3.85, DARK]]),
    G([...flatbed(12.4),                                           // 5 shipping container
      [B(2.44, 12.2, 2.6), 0, -6.3, 2.5, 0x3b6ea8],
      [B(0.1, 12.2, 0.15),  1.23, -6.3, 2.5, 0x2a4f7a],
      [B(0.1, 12.2, 0.15), -1.23, -6.3, 2.5, 0x2a4f7a]]),
    G([...flatbed(12.0),                                           // 6 machinery haul
      [B(2.4, 4.2, 1.6), 0, -6.0, 2.1, YEL],
      [B(0.4, 0.4, 2.4), 0.6, -6.6, 3.0, DARK],
      [B(1.6, 1.2, 0.6), 0, -4.0, 2.4, DARK]]),
    G([[B(2.6, 7.5, 2.2), 0, -4.2, 2.3, STEEL],                    // 7 short dump body
      [B(2.6, 7.5, 0.5), 0, -4.2, 0.55, DARK],
      [B(2.4, 7.0, 0.5), 0, -4.2, 3.5, 0x8a7a5a],
      [B(2.5, 0.06, 0.2), 0, -7.98, 1.0, TL]]),
    G([...flatbed(13.0),                                           // 8 log / pipe load
      ...[-2.5, -6.0, -9.5].map(y => [B(2.6, 0.12, 2.6), 0, y, 2.5, STEEL]),
      ...[0.6, 0.0, -0.6].flatMap(x => [
        [C(0.3, 12.6, 8), x, -6.7, 1.5, WOOD2, RZ],
        [C(0.28, 12.6, 8), x + 0.3, -6.7, 2.05, WOOD, RZ]]),
      [C(0.3, 12.6, 8), 0.3, -6.7, 2.6, WOOD2, RZ]]),
    G(tr(8.6, 3.8, LIGHT))                                         // 9 pup trailer
  ];

  /* =========================================================================
     WHEELS — four concentric pieces so the rim reads separately from the tyre:
       tyre (dark rubber) > rim face (grey/chrome) > inset > hub cap
     Authored on the axle axis: the cylinder is rotated Z so it spins about X.
     `r` is returned alongside the geometry because the render loop needs it
     both to sit the wheel at ride height and to derive rolling rotation.
     ========================================================================= */
  // [radius, width, rim ratio, rim colour]
  const wheelSpec = r0 => [
    [r0,        0.36, 0.62, 0x9aa3a8], [r0 + 0.02, 0.40, 0.66, CHROME  ],
    [r0 + 0.05, 0.44, 0.58, 0x5a6166], [r0 + 0.06, 0.46, 0.60, 0x9aa3a8],
    [r0 - 0.02, 0.34, 0.64, 0x2a2e31], [r0,        0.38, 0.70, CHROME  ],
    [r0 + 0.03, 0.42, 0.60, 0x7d868c], [r0 + 0.01, 0.36, 0.56, 0x9aa3a8],
    [r0 + 0.04, 0.44, 0.68, 0xb9c0c4], [r0 - 0.01, 0.36, 0.60, 0x5a6166]
  ];
  const wheel = ([r, w, rim, rc]) => ({
    r,
    geo: G([
      [C(r, w, 14),                 0, 0, 0, DARK,     RZ],   // tyre
      [C(r * rim, w + 0.04, 12),    0, 0, 0, rc,       RZ],   // rim face
      [C(r * rim * 0.55, w + 0.07, 10), 0, 0, 0, 0x2b3033, RZ], // inset
      [C(r * 0.16, w + 0.1, 8),     0, 0, 0, 0x9aa3a8, RZ]    // hub cap
    ])
  });

  /* =========================================================================
     LIBRARY + AXLE LAYOUT
     `axles` are [x, y] offsets in the vehicle frame. Trucks carry a second
     set for the trailer bogie, placed in the TRAILER's frame.
     ========================================================================= */
  const lib = {
    car: {
      f: carFront, c: carCabin, b: carBack, w: wheelSpec(0.34).map(wheel),
      axles: [[0.95, 1.5], [-0.95, 1.5], [0.95, -1.5], [-0.95, -1.5]]
    },
    van: {
      f: vanFront, c: vanCabin, b: vanBack, w: wheelSpec(0.40).map(wheel),
      axles: [[1.0, 1.9], [-1.0, 1.9], [1.0, -1.7], [-1.0, -1.7]]
    },
    truck: {
      f: cabFront, c: cabCabin, b: trailer, w: wheelSpec(0.52).map(wheel),
      axles: [[1.15, 8.2], [-1.15, 8.2], [1.15, 5.4], [-1.15, 5.4]],
      trailerAxles: [[1.15, -9.2], [-1.15, -9.2], [1.15, -10.6], [-1.15, -10.6]]
    }
  };

  /* =========================================================================
     FORKLIFT + CRATE — faces +Y. Two baked variants (empty / loaded) rather
     than a moving fork, so the shuttle animation is a swap between two
     instanced meshes at the same transform: no per-frame geometry work.
     ========================================================================= */
  const fk = [
    [B(1.0, 1.6, 0.8),  0, -0.1, 0.8, YEL],        // body
    [B(1.0, 0.5, 0.6),  0, -1.0, 0.7, DARK],       // counterweight
    [B(0.08, 0.08, 2.1),  0.42, 0.85, 1.35, DARK], // mast R
    [B(0.08, 0.08, 2.1), -0.42, 0.85, 1.35, DARK], // mast L
    [B(0.9, 0.1, 0.1),  0, 0.85, 2.3, DARK],       // mast crown
    [B(0.06, 0.06, 1.0),  0.42, -0.6, 1.7, DARK],  // cage post R
    [B(0.06, 0.06, 1.0), -0.42, -0.6, 1.7, DARK],  // cage post L
    [B(0.95, 1.4, 0.06), 0, 0.1, 2.2, DARK],       // overhead guard
    [B(0.5, 0.5, 0.4),   0, -0.4, 1.4, 0x2b3033],  // seat
    [B(0.12, 1.1, 0.06),  0.28, 1.45, 0.32, STEEL],// fork R
    [B(0.12, 1.1, 0.06), -0.28, 1.45, 0.32, STEEL],// fork L
    ...[[0.5, 0.5], [-0.5, 0.5], [0.5, -0.8], [-0.5, -0.8]]
      .map(([x, y]) => [C(0.3, 0.26, 10), x, y, 0.3, DARK, RZ])  // wheels
  ];
  const crate = [
    [B(0.95, 0.95, 0.95), 0, 1.55, 0.83, WOOD],
    [B(0.99, 0.99, 0.08), 0, 1.55, 0.5,  WOOD2],   // banding
    [B(0.99, 0.99, 0.08), 0, 1.55, 1.2,  WOOD2],
    [B(0.08, 0.99, 0.95),  0.47, 1.55, 0.83, WOOD2],
    [B(0.08, 0.99, 0.95), -0.47, 1.55, 0.83, WOOD2]
  ];
  lib.forkEmpty = G(fk);
  lib.forkCrate = G([...fk, ...crate]);

  /* =========================================================================
     PERSON — 1.72 m standing figure in a hi-vis vest, facing +Y.
     Built as eight boxes: legs, torso, vest band, arms, head, hard hat.
     ========================================================================= */
  lib.person = G([
    [B(0.16, 0.22, 0.78),  0.1, 0, 0.39, 0x1d2a3a],  // leg R
    [B(0.16, 0.22, 0.78), -0.1, 0, 0.39, 0x1d2a3a],  // leg L
    [B(0.46, 0.26, 0.62),  0,   0, 1.09, 0xff7a1a],  // hi-vis torso
    [B(0.50, 0.28, 0.08),  0,   0, 1.00, 0xe8ecea],  // reflective band
    [B(0.12, 0.20, 0.55),  0.3, 0, 1.05, 0xd9a679],  // arm R
    [B(0.12, 0.20, 0.55), -0.3, 0, 1.05, 0xd9a679],  // arm L
    [B(0.24, 0.24, 0.26),  0,   0, 1.55, 0xd9a679],  // head
    [B(0.30, 0.30, 0.10),  0,   0, 1.72, YEL]        // hard hat
  ]);

  return lib;
}

/* =============================================================================
   ASSEMBLY — how the pieces come together at render time
   =============================================================================

   1. PART SELECTION (once per vehicle, at spawn)
      Four seeded random indices, one per slot. Same seed = same vehicle every
      reload, which matters because the console persists selection by id:

          v.parts = { w: rnd(10), f: rnd(10), c: rnd(10), b: rnd(10) };

   2. INSTANCED GROUPING (once, at layer creation)
      Vehicles are bucketed by (type, slot, variant). Every bucket becomes ONE
      InstancedMesh, so a 2,400-vehicle fleet costs ~120 draw calls rather than
      ~30,000. Per-vehicle livery is an instance colour; the tint attribute
      decides which vertices it reaches.

          key = type + slot + variantIndex   ->   InstancedMesh(geo, mat, n)

      Wheels need N instances per vehicle (4 for car/van, 8 for a truck with
      trailer bogie), so the wheel mesh is allocated at count * per.

   3. PAINT SHADER
      One material patch multiplies the instance colour into vertex colour only
      where tint == 1, leaving glass, chrome, rubber and wood at their authored
      values:

          vColor.xyz *= mix(vec3(1.0), instanceColor.xyz, tint);

   4. PER-FRAME TRANSFORMS
      Body parts f, c, b share the vehicle's transform — position (mx, my),
      heading rotated about +Z. Because the slots were authored in one frame,
      no per-part offset is needed.

      TRAILER: the truck's b slot uses its own frame, offset forward along the
      tractor heading to the kingpin and rotated by the trailer's own heading,
      which lags the tractor's. That lag is what makes a semi track and swing
      through turns:

          hitch = (mx + sin(h) * 5.4, my + cos(h) * 5.4),  rot = trailerHeading

      WHEELS: offsets are rotated into world space by the parent's heading, the
      wheel is lifted to its radius, and rolling is a rotation about local X
      derived from distance travelled — not from a timer, so wheels stop when
      the vehicle stops and never slip:

          spin = -distanceTravelled / radius
          q = quat(Z, -heading) * quat(X, spin)

      Trailer axles use the TRAILER frame, so they roll with its own heading.

   5. ACTIVITY PROPS
      FORKLIFT: while a vehicle is loading or unloading, one forklift shuttles
      between the vehicle's rear and a point offset toward the building. The
      trip parameter is smoothstepped so it eases at both ends, the heading
      flips on the return leg, and empty/loaded is chosen by direction —
      carrying inbound when unloading, outbound when loading. Only one of the
      two meshes is placed at a given index; the other is collapsed to zero
      scale, which is how instanced meshes "hide" a slot.

      PERSON: for cars and vans (never a semi), a driver stands beside the
      door, turned to face the vehicle, with a small vertical bob so the figure
      doesn't read as a static prop. The figure is removed a few seconds before
      departure to imply boarding.

   6. SCALE
      Everything is multiplied by a zoom-derived factor k, clamped to 1..2, so
      vehicles stay legible when zoomed out without ballooning up close. k also
      scales the offsets (hitch, axles, forklift path) — otherwise the layout
      would come apart at zoom.

   ============================================================================= */

if (typeof module !== 'undefined' && module.exports) module.exports = { buildFleetGeometry };
if (typeof window !== 'undefined') window.buildFleetGeometry = buildFleetGeometry;
