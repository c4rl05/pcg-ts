var e=`{
  "formatVersion": 1,
  "seed": 1101,
  "meta": {
    "title": "Cut a path where a field goes negative",
    "description": "\`pathClip\` changes a path's TOPOLOGY by value: it resolves \`field\` at every vertex, keeps the stretches where it is >= 0, and cuts the polyline at the place the value crosses zero rather than at the nearest vertex, so each kept piece comes out as a polyline of its own that ends ON the boundary. Here the field is a noise less a threshold, so the ring is kept only where the noise runs high. The ring is CLOSED, and a closed path cut anywhere comes back as OPEN runs — a piece that straddles the ring's first point is one run, not two, because the closing segment is an ordinary segment of the ring. A segment whose two ends agree is never searched, so a sign change that dips between two vertices is invisible: that is why \`pathResample\` samples the curve densely first — the resolution of the cut is the resolution of the sampling. \`minLength\` drops the stubs a boundary leaves where it only grazes the path. The cut points are new points: they carry P from the root search, f32 columns lerped across their segment, and a seed of their own. \`arcAttr\` writes each point's distance from the start of ITS OWN piece — it restarts at 0 at every cut — and the tubes read it, so every piece starts thin where it was cut and swells to its full radius a few units in. \`runIndexAttr\` and \`lengthAttr\` report which piece of its source path a run is and how long it came out.",
    "tags": ["basics", "path", "curve", "topology", "fields"]
  },
  "nodes": [
    {
      "id": "curve",
      "type": "subgraph",
      "params": { "count": 64, "size": [16, 16, 16] },
      "ref": { "name": "shape/path-loop" }
    },
    {
      "id": "dense",
      "type": "pathResample",
      "params": { "mode": "count", "count": 400 }
    },
    {
      "id": "clip",
      "type": "pathClip",
      "params": {
        "field": {
          "fn": "sub",
          "args": [
            {
              "fn": "perlinNoise",
              "opts": {
                "frequency": 0.12,
                "seed": { "from": "node", "variant": 2 },
                "normalized": true,
                "position": { "fn": "position" }
              }
            },
            0.48
          ]
        },
        "minLength": 1.5,
        "runIndexAttr": "piece",
        "lengthAttr": "pieceLength",
        "arcAttr": "along"
      }
    },
    {
      "id": "tube",
      "type": "sweepProfile",
      "params": {
        "profile": "circle",
        "sides": 10,
        "radius": {
          "fn": "min",
          "args": [
            0.5,
            { "fn": "add", "args": [0.12, { "fn": "mul", "args": [0.15, { "fn": "attribute", "name": "along" }] }] }
          ]
        },
        "caps": true
      }
    }
  ],
  "connections": [
    { "from": ["curve", "out"], "to": ["dense", "in"] },
    { "from": ["dense", "out"], "to": ["clip", "in"] },
    { "from": ["clip", "out"], "to": ["tube", "in"] }
  ],
  "outputs": [
    { "id": "tube", "pin": "out", "name": "kept" },
    { "id": "dense", "pin": "out", "name": "path" }
  ]
}
`;export{e as default};