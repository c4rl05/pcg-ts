var e=`{\r
  "formatVersion": 1,\r
  "seed": 1104,\r
  "meta": {\r
    "title": "Cut a courtyard out of a block",\r
    "description": "\`polygonBoolean\` computes the union, intersection or difference of two sets of closed polylines in a plane — the ground plane 'xz' by default. The subject here is TWO overlapping squares on the \`in\` pin: loops of one set simply union, so they read as one L-shaped block. The \`clip\` pin carries a round courtyard, and 'difference' keeps what is inside the block and outside the courtyard. The result is closed polylines: the outer loop counter-clockwise, then its hole clockwise, with an i32 primitive attribute \`holeOf\` — -1 on an outline, and on a hole the primitive index of the outline it pierces. That is the convention \`extrudePolygon\` reads, so the plan extrudes AS IT COMES: a concave outline with a hole, the caps ear-clipped around the courtyard and the courtyard given walls of its own facing into it. Switch \`operation\` to 'union' and the courtyard fills the block's corner instead; 'intersection' keeps only the part of the courtyard inside the block. \`snapDistance\` is the documented epsilon: corners closer than it weld, so geometry that should meet but differs by f32 rounding still does.",\r
    "tags": ["basics", "surface", "mesh", "extrude", "topology"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "block",\r
      "type": "subgraph",\r
      "params": { "count": 4, "size": [18, 18, 18], "center": [0, 0, 0], "rotate": [0, 45, 0] },\r
      "ref": { "name": "shape/path-loop" }\r
    },\r
    {\r
      "id": "wing",\r
      "type": "subgraph",\r
      "params": { "count": 4, "size": [12, 12, 12], "center": [9, 0, 9], "rotate": [0, 45, 0] },\r
      "ref": { "name": "shape/path-loop" }\r
    },\r
    {\r
      "id": "subject",\r
      "type": "mergePrimitives",\r
      "params": {}\r
    },\r
    {\r
      "id": "court",\r
      "type": "subgraph",\r
      "params": { "count": 32, "size": [7, 7, 7], "center": [1, 0, 1], "rotate": [0, 0, 0] },\r
      "ref": { "name": "shape/path-loop" }\r
    },\r
    {\r
      "id": "plan",\r
      "type": "polygonBoolean",\r
      "params": { "operation": "difference", "plane": "xz", "groupAttr": "", "snapDistance": 0.0001 }\r
    },\r
    {\r
      "id": "massing",\r
      "type": "extrudePolygon",\r
      "params": { "distance": 5, "direction": "+y", "caps": "both", "sides": true }\r
    }\r
  ],\r
  "connections": [\r
    { "from": ["block", "out"], "to": ["subject", "in"] },\r
    { "from": ["wing", "out"], "to": ["subject", "in"] },\r
    { "from": ["subject", "out"], "to": ["plan", "in"] },\r
    { "from": ["court", "out"], "to": ["plan", "clip"] },\r
    { "from": ["plan", "out"], "to": ["massing", "in"] }\r
  ],\r
  "outputs": [\r
    { "id": "massing", "pin": "out", "name": "massing" },\r
    { "id": "plan", "pin": "out", "name": "plan" }\r
  ]\r
}\r
`;export{e as default};