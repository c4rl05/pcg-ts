var e=`{\r
  "formatVersion": 1,\r
  "seed": 1104,\r
  "meta": {\r
    "title": "treads winding up a helix",\r
    "description": "Index-driven layout that leaves the plane, and then puts a real piece of geometry on every station it computed. Tread i sits at angle \`i * 2*pi/20\` and height \`i * 0.8\`, so ANGLE AND RISE ARE BOTH FUNCTIONS OF \`index()\`: twenty treads to a turn, 20 of them, 19 steps and 0.95 of a turn up a helix of radius 7.6. \`basics-phyllotaxis\` computes position from the index too and is the graph to read against this one — it stays flat, it writes only P, and it instances nothing, so what it teaches ends at the arrangement.\\n\\nTHE ROTATION IS THE SAME INDEX, WRITTEN AS A QUATERNION. A tread's long axis must point away from the centre, and at angle \`th\` outward is (cos th, 0, sin th). A yaw of \`a\` about +Y takes local +X to (cos a, 0, -sin a), so the yaw wanted is \`-th\` and \`rot\` is the four numbers [0, -sin(th/2), 0, cos(th/2)] — two trig calls on a half angle the graph already has, which is why it is spelled directly rather than through \`orientAlongVector\`. That node's \`direction\` is field-capable and would reach the identical quaternion from vec(-sin th, 0, cos th); reach for it when the direction is DATA — a \`tangent\` column, a curve frame, a neighbour's position — rather than arithmetic already in hand. Local +Z falls out as the plan tangent, so the tread's width lies along the direction of travel with nothing further to state.\\n\\nTHE YAW IS THE WHOLE ROTATION, AND THAT IS A DECISION. The helix's real tangent climbs 0.80 for every 2.388 of arc at the tread's centre radius, a little over 18 degrees. Orienting the tread to the FULL three-dimensional tangent would tilt every one of them by that angle, which is not a stair but a spiral ramp cut into 20 pieces. So the tread follows the helix IN PLAN and is left level on purpose, and the rise is carried by the gap between treads rather than by their attitude: 'face along the curve' is two different requests once a curve leaves the plane, and this graph answers one of them.\\n\\nIT STOPS AT 0.95 OF A TURN, AND THAT IS ALSO A DECISION. Past one full turn tread 20 sits directly above tread 0 and the flight starts hiding itself: from anywhere above, the run you can actually follow is only ever the last turn, and the rest is a stack of edges. Nineteen steps of a twentieth is the most a single readable flight holds. More height is a second flight, not a longer one — and the arithmetic here does not care either way, which is exactly the point: \`count\` is the only number that changes.\\n\\n\`copyToPoints\` WITH \`topology: \\"keep\\"\` IS NOT A CONVENIENCE HERE. The source is one \`meshPrimitive\` box — 24 points and 12 triangles, and the only mesh a serialized graph can cook at all, since \`dataInput\`'s items are injected at runtime and a saved file carries none. Copying it onto the 20 stations composes P = targetP + targetRot * (targetScale * sourceP) per copy, with scale 1 throughout, and yields 480 points and 240 triangles. Drop the topology, which is the default, and 480 loose points come out with no surface on them: a POLYLINE source can be rebuilt downstream (\`targetIndexAttr\`, then \`pointsToPath\` grouping on it), but nothing here rebuilds a TRIANGLE — both surface nodes, \`sweepProfile\` and \`extrudePolygon\`, start from polyline topology. For a mesh source, 'keep' is what makes the copies geometry instead of a cloud somebody has to reconstruct.\\n\\nA RECTANGLE IS NOT A WEDGE, and the numbers say by how much. The tread is 8.0 by 3.3, reaching from radius 3.6 out to 11.6, and one twentieth of a turn is 3.644 of arc at the outer edge against 1.131 at the inner one. So the rim is very nearly solid — 0.344 of daylight between consecutive treads, which is what makes the flight read as one thing — while at the newel the same 3.3 overlaps its neighbour by 2.169, just under two thirds of its own width. A real stair fixes that with a wedge and \`meshPrimitive\`, building a plane or a box and nothing else, cannot; the overlap survives the picture only because consecutive treads are 0.80 apart in y, and because the stair does not go inside radius 3.6 at all. \`extrudePolygon\` over a four-point closed polyline is the honest fix, at the price of authoring the corners.\\n\\nTHE NEWEL IS MERGED, NOT COPIED: one thing spanning the whole rise, so it is a second \`meshPrimitive\` joined by \`mergePrimitives\`, where putting it in the copy source would give 20 of them stacked in one place. Its 5.2 square reaches 3.677 at the corners against the treads' 3.6 — which is enough for the eight treads flanking the diagonals to bite into it, and not enough for the other twelve: those stand off by 0.866, and the four square-on to a face by a full 1.0. That is the same wedge problem one axis over, since a square core meets a circular inner edge no better than a rectangular tread fills a wedge, and the plan view shows sky through the gap. A newel of 7.2 or more closes it, at the price of a core that owns the picture. The proportions are still a picture's rather than a building code's — the rise is 0.34 of the going where a built stair is nearer 0.6 — because a stair steep enough to climb is taller than it is wide, and a camera looking down at a scene from a fixed pose crops exactly that. Nothing here reads the seed, the layout being arithmetic on the index all the way down, so this graph cooks the same 504 points every time.",\r
    "tags": ["basics", "copy", "structure", "mesh", "fields"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "stations",\r
      "type": "pointLine",\r
      "params": { "mode": "endpoints", "count": 20, "start": [0, 0, 0], "end": [1, 0, 0] }\r
    },\r
    {\r
      "id": "helix",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "P",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            {\r
              "fn": "mul",\r
              "args": [\r
                7.6,\r
                { "fn": "cos", "args": [{ "fn": "mul", "args": [{ "fn": "index" }, 0.3141592653589793] }] }\r
              ]\r
            },\r
            { "fn": "mul", "args": [{ "fn": "index" }, 0.8] },\r
            {\r
              "fn": "mul",\r
              "args": [\r
                7.6,\r
                { "fn": "sin", "args": [{ "fn": "mul", "args": [{ "fn": "index" }, 0.3141592653589793] }] }\r
              ]\r
            }\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "facing",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "rot",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 4,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            0,\r
            {\r
              "fn": "mul",\r
              "args": [\r
                -1,\r
                { "fn": "sin", "args": [{ "fn": "mul", "args": [{ "fn": "index" }, 0.15707963267948966] }] }\r
              ]\r
            },\r
            0,\r
            { "fn": "cos", "args": [{ "fn": "mul", "args": [{ "fn": "index" }, 0.15707963267948966] }] }\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "tread",\r
      "type": "meshPrimitive",\r
      "params": {\r
        "shape": "box",\r
        "size": [8, 0.44, 3.3],\r
        "center": [0, 0, 0],\r
        "subdivisions": [1, 1, 1]\r
      }\r
    },\r
    { "id": "treads", "type": "copyToPoints", "params": { "topology": "keep" } },\r
    {\r
      "id": "newel",\r
      "type": "meshPrimitive",\r
      "params": {\r
        "shape": "box",\r
        "size": [5.2, 15.9, 5.2],\r
        "center": [0, 7.7, 0],\r
        "subdivisions": [1, 1, 1]\r
      }\r
    },\r
    { "id": "stair", "type": "mergePrimitives", "params": {} }\r
  ],\r
  "connections": [\r
    { "from": ["stations", "out"], "to": ["helix", "in"] },\r
    { "from": ["helix", "out"], "to": ["facing", "in"] },\r
    { "from": ["tread", "out"], "to": ["treads", "source"] },\r
    { "from": ["facing", "out"], "to": ["treads", "target"] },\r
    { "from": ["treads", "out"], "to": ["stair", "in"] },\r
    { "from": ["newel", "out"], "to": ["stair", "in"] }\r
  ],\r
  "outputs": [{ "id": "stair", "pin": "out", "name": "stair" }]\r
}\r
`;export{e as default};