var e=`{
  "formatVersion": 1,
  "seed": 1131,
  "meta": {
    "title": "Repeat each point its own number of times",
    "description": "\`repeatPoints\` emits every input point \`count\` times and numbers the copies 0, 1, ..., count - 1 in \`indexAttr\` (here the default, \`copy\`). The count is a FIELD read per input point, so each of these eight towers asks for its own height: \`storeys\` is a whole number from 1 to 6 drawn per point, and \`count\` reads it straight back. A count of 0 would drop the point; a fractional one is rounded to nearest. THE COPIES ARE COINCIDENT and the node moves nothing — placing them is the next node's job, and it places them by the index: \`transformPoints\` lifts copy k by k, which turns each point into a stack. THE COPIES ARRIVE POINT-MAJOR, every copy of the first tower before any copy of the second, and EVERY POINT ATTRIBUTE COMES WITH THEM with no list to keep: the \`scale\` and the STRING \`piece\` are both written once per tower, before the repeat, and reach every storey intact — \`spawnInstances\` reads \`piece\` as the asset id, so the towers alternate boxes and panels. EACH COPY GETS ITS OWN SEED, hashCombine(pointSeed, copy), because a point's identity is its position bits plus its seed and coincident copies sharing one seed would be the same point to every random draw. \`tint\` shows it: it is drawn with \`randomField\` straight after the repeat, BEFORE anything moves, while the storeys of one tower still sit on the same spot — so the seed is the only thing telling them apart, and they come out different colours because of it. Copy 0 is re-seeded too, so two repeats in a row still give every copy a seed of its own. WHAT IT REPLACES is the fixed-width fan-out: a rule cloud as wide as the largest count anyone could need, stamped with copyToPoints, every attribute listed in \`targetNames\` by hand, and the surplus filtered away by \`slot < n\` — most of the copies made only to be thrown out, and an attribute left off the list silently gone.",
    "tags": ["basics", "repeat", "copy", "attributes"]
  },
  "nodes": [
    {
      "id": "row",
      "type": "pointLine",
      "params": { "mode": "endpoints", "count": 8, "start": [-14, 0, 0], "end": [14, 0, 0] }
    },
    {
      "id": "storeys",
      "type": "setAttribute",
      "params": {
        "name": "storeys",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [1, { "fn": "floor", "args": [{ "fn": "mul", "args": [{ "fn": "randomField", "key": "storeys" }, 6] }] }]
        }
      }
    },
    {
      "id": "piece",
      "type": "setAttribute",
      "params": {
        "name": "piece",
        "domain": "point",
        "type": "string",
        "values": ["box", "panel"],
        "value": { "fn": "mod", "args": [{ "fn": "index" }, 2] }
      }
    },
    {
      "id": "size",
      "type": "setAttribute",
      "params": { "name": "scale", "domain": "point", "type": "f32", "tupleSize": 3, "value": { "fn": "vec", "args": [4, 2.2, 4] } }
    },
    {
      "id": "repeat",
      "type": "repeatPoints",
      "params": { "count": { "fn": "attribute", "name": "storeys" } }
    },
    {
      "id": "tint",
      "type": "setAttribute",
      "params": {
        "name": "color",
        "domain": "point",
        "type": "f32",
        "tupleSize": 4,
        "value": {
          "fn": "vec",
          "args": [
            { "fn": "remap", "args": [{ "fn": "randomField", "key": "tint" }, 0, 1, 0.55, 0.95] },
            0.45,
            0.35,
            1
          ]
        }
      }
    },
    {
      "id": "stack",
      "type": "transformPoints",
      "params": {
        "translate": { "fn": "vec", "args": [0, { "fn": "attribute", "name": "copy" }, 0] }
      }
    },
    {
      "id": "spawn",
      "type": "spawnInstances",
      "params": { "assetId": "box", "assetAttr": "piece", "colorAttr": "color" }
    }
  ],
  "connections": [
    { "from": ["row", "out"], "to": ["storeys", "in"] },
    { "from": ["storeys", "out"], "to": ["piece", "in"] },
    { "from": ["piece", "out"], "to": ["size", "in"] },
    { "from": ["size", "out"], "to": ["repeat", "in"] },
    { "from": ["repeat", "out"], "to": ["tint", "in"] },
    { "from": ["tint", "out"], "to": ["stack", "in"] },
    { "from": ["stack", "out"], "to": ["spawn", "in"] }
  ],
  "outputs": [
    { "id": "stack", "pin": "out", "name": "points" },
    { "id": "spawn", "pin": "instances", "name": "instances" }
  ]
}
`;export{e as default};