var e=`{
  "formatVersion": 1,
  "seed": 1104,
  "meta": {
    "title": "Cut a courtyard out of a block",
    "description": "\`polygonBoolean\` computes the union, intersection or difference of two sets of closed polylines in a plane — the ground plane 'xz' by default. The subject here is TWO overlapping squares on the \`in\` pin: loops of one set simply union, so they read as one L-shaped block. The \`clip\` pin carries a round courtyard, and 'difference' keeps what is inside the block and outside the courtyard. The result is closed polylines: the outer loop counter-clockwise, then its hole clockwise, with an i32 primitive attribute \`holeOf\` — -1 on an outline, and on a hole the primitive index of the outline it pierces. That is the convention \`extrudePolygon\` reads, so the plan extrudes AS IT COMES: a concave outline with a hole, the caps ear-clipped around the courtyard and the courtyard given walls of its own facing into it. Switch \`operation\` to 'union' and the courtyard fills the block's corner instead; 'intersection' keeps only the part of the courtyard inside the block. \`snapDistance\` is the documented epsilon: corners closer than it weld, so geometry that should meet but differs by f32 rounding still does.",
    "tags": ["basics", "surface", "mesh", "extrude", "topology"]
  },
  "nodes": [
    {
      "id": "block",
      "type": "subgraph",
      "params": { "count": 4, "size": [18, 18, 18], "center": [0, 0, 0], "rotate": [0, 45, 0] },
      "ref": { "name": "shape/path-loop" }
    },
    {
      "id": "wing",
      "type": "subgraph",
      "params": { "count": 4, "size": [12, 12, 12], "center": [9, 0, 9], "rotate": [0, 45, 0] },
      "ref": { "name": "shape/path-loop" }
    },
    {
      "id": "subject",
      "type": "mergePrimitives",
      "params": {}
    },
    {
      "id": "court",
      "type": "subgraph",
      "params": { "count": 32, "size": [7, 7, 7], "center": [1, 0, 1], "rotate": [0, 0, 0] },
      "ref": { "name": "shape/path-loop" }
    },
    {
      "id": "plan",
      "type": "polygonBoolean",
      "params": { "operation": "difference", "plane": "xz", "groupAttr": "", "snapDistance": 0.0001 }
    },
    {
      "id": "massing",
      "type": "extrudePolygon",
      "params": { "distance": 5, "direction": "+y", "caps": "both", "sides": true }
    }
  ],
  "connections": [
    { "from": ["block", "out"], "to": ["subject", "in"] },
    { "from": ["wing", "out"], "to": ["subject", "in"] },
    { "from": ["subject", "out"], "to": ["plan", "in"] },
    { "from": ["court", "out"], "to": ["plan", "clip"] },
    { "from": ["plan", "out"], "to": ["massing", "in"] }
  ],
  "outputs": [
    { "id": "massing", "pin": "out", "name": "massing" },
    { "id": "plan", "pin": "out", "name": "plan" }
  ]
}
`;export{e as default};