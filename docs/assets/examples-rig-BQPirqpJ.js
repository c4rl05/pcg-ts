var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Spine",\r
      "controls": [\r
        { "param": "spineLine.start", "label": "From" },\r
        { "param": "spineLine.end", "label": "To" },\r
        { "param": "spineSpine.count", "label": "Samples", "min": 40, "max": 300, "step": 10 },\r
        { "param": "spineWander.translate.verticalAmplitude", "label": "Wander up", "step": 0.1 },\r
        { "param": "spineWander.translate.horizontalAmplitude", "label": "Wander across", "step": 0.1 },\r
        { "param": "spineWander.translate.wanderScale", "label": "Wander scale", "step": 0.1 },\r
        {\r
          "param": "spineWander.translate.variantUp",\r
          "label": "Variant up",\r
          "description": "Which of the up-and-down wanders, of the many this node can draw. It is the \`variant\` in the noise's \`opts.seed\`, hashed with the node's own seed, so it re-rolls THIS noise and nothing else — the seed box moves every noise at once, this moves one. A whole number: it names a draw, it does not scale one.",\r
          "min": 0,\r
          "max": 16,\r
          "step": 1\r
        },\r
        {\r
          "param": "spineWander.translate.variantAcross",\r
          "label": "Variant across",\r
          "description": "The same dial for the sideways wander. Two dials rather than one is the whole point: a node has a single seed, so before inline params the two noises could only be re-rolled together.",\r
          "min": 0,\r
          "max": 16,\r
          "step": 1\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Truss",\r
      "controls": [\r
        { "param": "trussCells.count", "label": "Stations", "min": 8, "max": 120, "step": 2 },\r
        { "param": "$trussHalfWidth", "label": "Half width", "step": 0.025 },\r
        {\r
          "param": "trussChordSkin.radius",\r
          "label": "Chord",\r
          "min": 0.01,\r
          "max": 0.2,\r
          "step": 0.005\r
        },\r
        { "param": "$braceRadius", "label": "Brace", "step": 0.005 }\r
      ]\r
    },\r
    {\r
      "title": "Components",\r
      "controls": [\r
        { "param": "partDense.count", "label": "Density", "min": 100, "max": 2000, "step": 50 },\r
        { "param": "partCluster.threshold", "label": "Cluster cut", "min": 0, "max": 1, "step": 0.01 },\r
        {\r
          "param": "partScatter.amount.scatterSteps",\r
          "label": "Scatter",\r
          "description": "How far a component may wander off its sample, in STEPS of the sampling above it: 0.5 is half a step, so neighbours can meet but not cross. It reads the step \`partDense\` publishes, so it keeps that meaning as the density knob moves — where a frozen distance was 0.05 of a step at 100 samples and 1.1 of one at 2000.",\r
          "min": 0,\r
          "max": 1.5,\r
          "step": 0.05\r
        },\r
        {\r
          "param": "partSize.value.partScale",\r
          "label": "Part size",\r
          "description": "One multiplier over every component, on top of the per-point size draw and the per-kind proportions. It was a frozen 1 in the expression until a plain node could carry a param of its own.",\r
          "min": 0.3,\r
          "max": 3,\r
          "step": 0.05\r
        },\r
        { "param": "$stretchMin", "label": "Stretch min", "step": 0.05 },\r
        { "param": "$stretchMax", "label": "Stretch max", "step": 0.05 },\r
        {\r
          "param": "partDensity.value.clusterVariant",\r
          "label": "Cluster variant",\r
          "description": "Re-rolls the noise that decides WHERE the components clump, without moving the spine or anything else the seed box would move with it.",\r
          "min": 0,\r
          "max": 16,\r
          "step": 1\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Cables",\r
      "controls": [\r
        { "param": "wrapCarrierLine.count", "label": "Wraps", "min": 1, "max": 40, "step": 1 },\r
        { "param": "wrapCells.count", "label": "Wrap steps", "min": 20, "max": 400, "step": 10 },\r
        { "param": "$cableRadius", "label": "Cable radius", "step": 0.005 },\r
        { "param": "chainAnchors.count", "label": "Chains", "min": 2, "max": 20, "step": 1 },\r
        { "param": "danglerAnchors.count", "label": "Danglers", "min": 10, "max": 400, "step": 10 },\r
        { "param": "$bundles", "label": "Bundles", "step": 1 },\r
        {\r
          "param": "danglerCurl.translate.curlVariantX",\r
          "label": "Curl variant x",\r
          "min": 0,\r
          "max": 16,\r
          "step": 1\r
        },\r
        {\r
          "param": "danglerCurl.translate.curlVariantZ",\r
          "label": "Curl variant z",\r
          "description": "The fringe curls on two noises, one per horizontal axis. A dial each, so a cable bundle can be pushed out of a plane it happened to fall into.",\r
          "min": 0,\r
          "max": 16,\r
          "step": 1\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Swags",\r
      "controls": [\r
        { "param": "drapeDrapeAnchors.count", "label": "Anchors", "min": 4, "max": 120, "step": 2 },\r
        { "param": "drapeChords.mode", "label": "Pairing" },\r
        { "param": "drapeChords.radius", "label": "Reach", "min": 1, "max": 30, "step": 0.5 },\r
        { "param": "drapeDrapeEven.count", "label": "Segments", "min": 4, "max": 64, "step": 1 },\r
        { "param": "drapeLong.value", "label": "Min length", "min": 0, "max": 20, "step": 0.25 },\r
        { "param": "drapeSome.value", "label": "Keep", "min": 0, "max": 1, "step": 0.02 },\r
        {\r
          "param": "drapeSag.translate.sagVariant",\r
          "label": "Sag variant",\r
          "description": "Re-rolls how deep each swag hangs. The picks that decide WHICH chords are hung are keyed on primitive identity, so they move with the anchors rather than with this.",\r
          "min": 0,\r
          "max": 16,\r
          "step": 1\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Skins",\r
      "controls": [{ "param": "$tubeSides", "label": "Tube sides", "step": 1 }]\r
    }\r
  ]\r
}\r
`;export{e as default};