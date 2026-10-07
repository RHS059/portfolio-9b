const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
/** Authored actor anchors derived from the mapped terminal assets; all dimensions in meters. */
export const CARGO_LAYOUT=freeze({
  "version": "cargo-layout/v2",
  "units": "meters",
  "axes": "X east, Y north, Z up; actor heading0 points +Y, group rotationZ=-heading",
  "scope": "Illustrative equipment and interior anchors on verified Oakland map context; not an operational/surveyed plan.",
  "origins": {
    "worldLngLat": [
      -122.308,
      37.805
    ],
    "oictLngLat": [
      -122.3141666667,
      37.7963888889
    ],
    "centerpointWorld": {
      "id": "centerpoint",
      "label": "Drone factory",
      "caption": "",
      "x": -86.7315395432005,
      "y": 888.5228440002203,
      "width": 150,
      "depth": 90,
      "focusZoom": 18.3
    }
  },
  "anchorConvention": "Cargo anchors are bottom-center support points. One constant pallet1.20x1.00x0.19m plus carton0.805x0.605x0.487m, totalheight0.677m. No scale changes at handoffs.",
  "ships": [
    {
      "id": "SHIP-01",
      "center": [
        -119.92759414568556,
        -39.72370644515149,
        0
      ],
      "rotationZ": -0.31443714812401,
      "length": 168,
      "beam": 26,
      "deckTop": 8.5
    },
    {
      "id": "SHIP-02",
      "center": [
        -312.97603859013003,
        23.060849110404092,
        0
      ],
      "rotationZ": -0.31443714812401,
      "length": 168,
      "beam": 26,
      "deckTop": 8.5
    }
  ],
  "slots": [
    {
      "id": "CARGO-01",
      "shipId": "SHIP-01",
      "craneId": "CRANE-01",
      "staticGantryId": "schematic-gantry-2",
      "port": {
        "berthIndex": 0,
        "shipCargo": [
          -116.46364398154923,
          -29.07283562345902,
          8.5
        ],
        "transfer": [
          -101.98928079569386,
          15.4325888814702,
          0.03
        ],
        "truckRoot": [
          -94.30505887370914,
          8.99013333612961,
          0.15
        ],
        "truckHeading": 1.8852334749189068,
        "cargoRotationZ": -0.31443714812401025
      },
      "factory": {
        "bayId": "factory-receiving-01",
        "truckRoot": [
          -56,
          -56.5,
          0.15
        ],
        "truckHeading": 1.5707963267948966,
        "approach": [
          -66.5,
          -56.5,
          0.15
        ],
        "handoff": [
          -65.3,
          -55.75,
          1.48
        ],
        "storage": [
          -62,
          -16,
          1.225
        ],
        "forkliftPark": [
          -68,
          -32,
          0.25
        ],
        "robotPark": [
          -62,
          -20,
          1.225
        ],
        "forkliftPickupRoot": [
          -65.3,
          -54.1,
          0.25
        ],
        "forkliftPickupHeading": 3.141592653589793,
        "forkliftPickupLiftHeight": 1.325,
        "forkliftPlaceLiftHeight": 1.07
      }
    },
    {
      "id": "CARGO-02",
      "shipId": "SHIP-01",
      "craneId": "CRANE-02",
      "staticGantryId": "schematic-gantry-3",
      "port": {
        "berthIndex": 0,
        "shipCargo": [
          -114.56170276338986,
          -29.69139815276908,
          8.5
        ],
        "transfer": [
          -104.4635309129341,
          7.824824008832726,
          0.03
        ],
        "truckRoot": [
          -96.77930899094939,
          1.3823684634921358,
          0.15
        ],
        "truckHeading": 1.8852334749189068,
        "cargoRotationZ": -0.31443714812401025
      },
      "factory": {
        "bayId": "factory-receiving-02",
        "truckRoot": [
          -40,
          -56.5,
          0.15
        ],
        "truckHeading": 1.5707963267948966,
        "approach": [
          -50.5,
          -56.5,
          0.15
        ],
        "handoff": [
          -49.3,
          -55.75,
          1.48
        ],
        "storage": [
          -52,
          -16,
          1.225
        ],
        "forkliftPark": [
          -44,
          -32,
          0.25
        ],
        "robotPark": [
          -52,
          -20,
          1.225
        ],
        "forkliftPickupRoot": [
          -49.3,
          -54.1,
          0.25
        ],
        "forkliftPickupHeading": 3.141592653589793,
        "forkliftPickupLiftHeight": 1.325,
        "forkliftPlaceLiftHeight": 1.07
      }
    },
    {
      "id": "CARGO-03",
      "shipId": "SHIP-02",
      "craneId": "CRANE-03",
      "staticGantryId": "schematic-gantry-6",
      "port": {
        "berthIndex": 1,
        "shipCargo": [
          -309.51208842599374,
          33.711719932096564,
          8.5
        ],
        "transfer": [
          -295.03772524013834,
          78.2171444370258,
          0.03
        ],
        "truckRoot": [
          -287.3535033181537,
          71.7746888916852,
          0.15
        ],
        "truckHeading": 1.8852334749189068,
        "cargoRotationZ": -0.31443714812401025
      },
      "factory": {
        "bayId": "factory-receiving-01",
        "truckRoot": [
          -56,
          -56.5,
          0.15
        ],
        "truckHeading": 1.5707963267948966,
        "approach": [
          -66.5,
          -56.5,
          0.15
        ],
        "handoff": [
          -65.3,
          -55.75,
          1.48
        ],
        "storage": [
          -62,
          -26,
          1.225
        ],
        "forkliftPark": [
          -60,
          -32,
          0.25
        ],
        "robotPark": [
          -62,
          -30,
          1.225
        ],
        "forkliftPickupRoot": [
          -65.3,
          -54.1,
          0.25
        ],
        "forkliftPickupHeading": 3.141592653589793,
        "forkliftPickupLiftHeight": 1.325,
        "forkliftPlaceLiftHeight": 1.07
      }
    },
    {
      "id": "CARGO-04",
      "shipId": "SHIP-02",
      "craneId": "CRANE-04",
      "staticGantryId": "schematic-gantry-7",
      "port": {
        "berthIndex": 1,
        "shipCargo": [
          -307.61014720783436,
          33.09315740278651,
          8.5
        ],
        "transfer": [
          -297.51197535737856,
          70.6093795643883,
          0.03
        ],
        "truckRoot": [
          -289.8277534353939,
          64.16692401904771,
          0.15
        ],
        "truckHeading": 1.8852334749189068,
        "cargoRotationZ": -0.31443714812401025
      },
      "factory": {
        "bayId": "factory-receiving-02",
        "truckRoot": [
          -40,
          -56.5,
          0.15
        ],
        "truckHeading": 1.5707963267948966,
        "approach": [
          -50.5,
          -56.5,
          0.15
        ],
        "handoff": [
          -49.3,
          -55.75,
          1.48
        ],
        "storage": [
          -52,
          -26,
          1.225
        ],
        "forkliftPark": [
          -36,
          -32,
          0.25
        ],
        "robotPark": [
          -52,
          -30,
          1.225
        ],
        "forkliftPickupRoot": [
          -49.3,
          -54.1,
          0.25
        ],
        "forkliftPickupHeading": 3.141592653589793,
        "forkliftPickupLiftHeight": 1.325,
        "forkliftPlaceLiftHeight": 1.07
      }
    }
  ],
  "factory": {
    "buildingBounds": {
      "min": [
        -75,
        -45,
        0
      ],
      "max": [
        75,
        45,
        12
      ]
    },
    "receivingBayRootHeading": 1.5707963267948966,
    "flatbedCargoAnchorLocal": [
      -0.75,
      -10.58,
      1.33
    ],
    "floorTop": 0.25,
    "storageSupportTop": 1.225,
    "workcells": [
      {
        "id": "frame-jig",
        "center": [
          -16,
          5,
          0
        ],
        "input": [
          -17.9,
          7.4,
          1.225
        ],
        "output": [
          -16,
          5,
          1.7
        ]
      },
      {
        "id": "motor-install",
        "center": [
          9,
          5,
          0
        ],
        "input": [
          7.1,
          7.4,
          1.225
        ],
        "output": [
          9,
          5,
          1.7
        ]
      },
      {
        "id": "propeller-install",
        "center": [
          -16,
          27,
          0
        ],
        "input": [
          -17.9,
          29.4,
          1.225
        ],
        "output": [
          -16,
          27,
          1.7
        ]
      },
      {
        "id": "final-assembly",
        "center": [
          9,
          27,
          0
        ],
        "input": [
          7.1,
          29.4,
          1.225
        ],
        "output": [
          9,
          27,
          1.7
        ]
      }
    ],
    "trailerRootConvention": "Trailer own ground-projection root has kingpin[0,0,1.195], coincident perframe with tractor fifthwheel[0,1.28,1.195].",
    "tractorFifthWheel": [
      0,
      1.28,
      1.195
    ],
    "trailerKingpin": [
      0,
      0,
      1.195
    ],
    "trailerAxlesY": [
      -8.28,
      -9.58
    ],
    "amrSupportLocalZ": 0.975,
    "receivingPads": [
      {
        "bayId": "factory-receiving-01",
        "bounds": {
          "min": [
            -69.3,
            -54.9,
            0
          ],
          "max": [
            -61.3,
            -44,
            0.25
          ]
        }
      },
      {
        "bayId": "factory-receiving-02",
        "bounds": {
          "min": [
            -53.3,
            -54.9,
            0
          ],
          "max": [
            -45.3,
            -44,
            0.25
          ]
        }
      }
    ],
    "cargoDimensions": {
      "pallet": [
        1.2,
        1,
        0.19
      ],
      "carton": [
        0.805,
        0.605,
        0.487
      ],
      "totalHeight": 0.677
    },
    "cargoYawRelative": 1.5707963267948966
  },
  "sourceUrls": [
    "https://www.oaklandseaport.com/wp-content/uploads/2026/01/Seaport-map-Port-Oakland_102025.pdf",
    "https://api.openstreetmap.org/api/0.6/map?bbox=-122.329,37.790,-122.296,37.808"
  ],
  "needsAssetConfirmation": [
    "Receiving support pads and interior floor elevation .25 must match exposed facility mounts.",
    "Single cargo uses actual flatbed support and fork pocket .095m above pallet bottom."
  ]
});
