import { logger } from '../utils/logger.js';

// Haversine Distance Formula in Meters
export function getDistance(c1, c2) {
  const R = 6371000; // Earth radius in meters
  const lat1 = c1[0] * Math.PI / 180;
  const lat2 = c2[0] * Math.PI / 180;
  const dLat = (c2[0] - c1[0]) * Math.PI / 180;
  const dLon = (c2[1] - c1[1]) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Calculate square of degree-based distance
function getDegreeDistanceSq(c1, c2) {
  return Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2);
}

// Safety Database
const AP_CITIES_DATA = {
    vijayawada: {
        center: [16.5062, 80.6480],
        police: [
            { id: "v_p1", name: "Suryaraopet Police Station", coords: [16.5115, 80.6385], description: "AP Police Station - 24/7 emergency response" },
            { id: "v_p2", name: "Governorpet Police Station", coords: [16.5145, 80.6272], description: "AP Police Station - Patrol control center" },
            { id: "v_p3", name: "Patamata Police Station", coords: [16.5028, 80.6685], description: "AP Police Station - Active sub-division" },
            { id: "v_p4", name: "Benz Circle Police Kiosk", coords: [16.5062, 80.6635], description: "Traffic and safety surveillance outpost" }
        ],
        lighting: [
            { id: "v_l1", name: "MG Road Commercial Corridor", coords: [16.5075, 80.6550], description: "Main highway corridor with LED municipal lighting" },
            { id: "v_l2", name: "Eluru Road Shopping Corridor", coords: [16.5180, 80.6320], description: "Well lit commercial high street" },
            { id: "v_l3", name: "Besant Road Retail Walkway", coords: [16.5135, 80.6305], description: "Highly lit shopping bazaar street" },
            { id: "v_l4", name: "Benz Circle High-Lux Grid", coords: [16.5060, 80.6625], description: "Fully illuminated major circle junction" }
        ],
        transit: [
            { id: "v_t1", name: "Pandit Nehru Bus Station (PNBS)", coords: [16.5098, 80.6185], line: "APSRTC City and Intercity Services" },
            { id: "v_t2", name: "Vijayawada Junction Railway Station", coords: [16.5185, 80.6210], line: "Main South Central Railway Nexus" },
            { id: "v_t3", name: "Benz Circle RTC Bus Stop", coords: [16.5060, 80.6640], line: "City commuter express bus line" }
        ],
        crowd: [
            { id: "v_c1", name: "Benz Circle Junction", coords: [16.5062, 80.6635], radius: 150, density: "High", value: 92, description: "Extremely busy crossing, high vehicle and pedestrian count." },
            { id: "v_c2", name: "Besant Road Bazaar", coords: [16.5135, 80.6300], radius: 130, density: "High", value: 88, description: "Highly populated shopping area with constant pedestrian presence." },
            { id: "v_c3", name: "PNBS Passenger Terminal", coords: [16.5095, 80.6180], radius: 160, density: "High", value: 90, description: "Busy transit station area with 24/7 foot traffic." }
        ],
        risk: [
            { id: "v_r1", name: "Rajiv Gandhi Park Back Alley (Quiet)", coords: [16.5050, 80.6120], radius: 65, riskLevel: "Medium", description: "Low lighting coverage and isolated path near railway lines." },
            { id: "v_r2", name: "Canal Bank Bypass Patches", coords: [16.5210, 80.6080], radius: 75, riskLevel: "High", description: "Isolated road along canal, poor streetlight density." }
        ]
    },
    visakhapatnam: {
        center: [17.6868, 83.2185],
        police: [
            { id: "viz_p1", name: "I Town Police Station", coords: [17.6920, 83.2985], description: "AP Police Command - Active sea front patrols" },
            { id: "viz_p2", name: "II Town Police Station (Dwaraka Nagar)", coords: [17.7280, 83.3020], description: "AP Police Command - City center safety response" },
            { id: "viz_p3", name: "Maharanipeta Police Station", coords: [17.7082, 83.3085], description: "AP Police Precinct - Active night surveillance" },
            { id: "viz_p4", name: "RK Beach Road Police Kiosk", coords: [17.7125, 83.3245], description: "Safety outpost and tourist help desk" }
        ],
        lighting: [
            { id: "viz_l1", name: "RK Beach Road Promenade", coords: [17.7120, 83.3240], description: "Vibrantly lit beachside walkway" },
            { id: "viz_l2", name: "VIP Road Commercial Corridor", coords: [17.7230, 83.3140], description: "High-end retail corridor with bright sodium lighting" },
            { id: "viz_l3", name: "Dwaraka Nagar Main Corridor", coords: [17.7290, 83.3015], description: "Main highway street with constant illumination" }
        ],
        transit: [
            { id: "viz_t1", name: "Dwaraka Nagar RTC Bus Complex", coords: [17.7275, 83.3030], line: "APSRTC Main Bus Hub" },
            { id: "viz_t2", name: "Visakhapatnam Junction Railway Station", coords: [17.7250, 83.2910], line: "East Coast Railway Hub" },
            { id: "viz_t3", name: "Maddilapalem Bus Station", coords: [17.7345, 83.3235], line: "Major city commute stop" }
        ],
        crowd: [
            { id: "viz_c1", name: "RK Beach Promenade", coords: [17.7140, 83.3255], radius: 180, density: "High", value: 90, description: "Highly populated sea walk, families and police patrols active." },
            { id: "viz_c2", name: "Jagadamba Junction Shopping Hub", coords: [17.7065, 83.3025], radius: 140, density: "High", value: 85, description: "Dense commercial and cinema street." },
            { id: "viz_c3", name: "Maddilapalem Junction Complex", coords: [17.7340, 83.3230], radius: 150, density: "High", value: 87, description: "Active transit hub with student and business crowds." }
        ],
        risk: [
            { id: "viz_r1", name: "Yarada Hill Road (Ghat Section)", coords: [17.6530, 83.2650], radius: 100, riskLevel: "High", description: "Isolated ghat road, no pedestrian traffic or lighting at night." },
            { id: "viz_r2", name: "Old Port Back Alleys", coords: [17.6910, 83.2940], radius: 80, riskLevel: "Medium", description: "Industrial zone, silent after dark with low visibility." }
        ]
    },
    kakinada: {
        center: [16.9890, 82.2475],
        police: [
            { id: "kk_p1", name: "Kakinada I Town Police Station", coords: [16.9555, 82.2370], description: "AP Police Precinct - Historic town command" },
            { id: "kk_p2", name: "Kakinada II Town Police Station", coords: [16.9740, 82.2355], description: "AP Police Station - Center region patrols" },
            { id: "kk_p3", name: "Kakinada III Town Police Station", coords: [16.9635, 82.2610], description: "AP Police Station - Port area response unit" },
            { id: "kk_p4", name: "Bhanugudi Circle Police Kiosk", coords: [16.9780, 82.2425], description: "Emergency assistance and traffic monitoring box" }
        ],
        lighting: [
            { id: "kk_l1", name: "Bhanugudi Main Road Corridor", coords: [16.9720, 82.2410], description: "Well lit commercial road linking city squares" },
            { id: "kk_l2", name: "Cinema Road Central Strip", coords: [16.9630, 82.2380], description: "Bright commercial stretch with high municipal streetlights" },
            { id: "kk_l3", name: "NFCL Road Smart Corridor", coords: [16.9940, 82.2490], description: "Industrial link road with newly installed LED street lighting" }
        ],
        transit: [
            { id: "kk_t1", name: "Kakinada Town Railway Station (COA)", coords: [16.9735, 82.2435], line: "SCR Main Train Terminal" },
            { id: "kk_t2", name: "Kakinada RTC Bus Complex", coords: [16.9675, 82.2385], line: "APSRTC Bus Depot and Intercity terminal" },
            { id: "kk_t3", name: "Kakinada Port Railway Station", coords: [16.9540, 82.2590], line: "Port connection trains" }
        ],
        crowd: [
            { id: "kk_c1", name: "Bhanugudi Junction Retail Block", coords: [16.9785, 82.2420], radius: 130, density: "High", value: 86, description: "Highly populated junction surrounded by food courts and shops." },
            { id: "kk_c2", name: "Temple Street Bazaar", coords: [16.9700, 82.2405], radius: 120, density: "High", value: 89, description: "Bustling retail street, heavy pedestrian traffic in evenings." },
            { id: "kk_c3", name: "Jagannaickpur Bridge Intersection", coords: [16.9525, 82.2415], radius: 110, density: "Medium-High", value: 80, description: "Transit point connecting old and new town areas." }
        ],
        risk: [
            { id: "kk_r1", name: "Kakinada Beach Bypass (Quiet at night)", coords: [16.9810, 82.2850], radius: 95, riskLevel: "Medium", description: "Scenic beachfront path, isolated and unlit late at night." },
            { id: "kk_r2", name: "Industrial Port Canal Alley", coords: [16.9450, 82.2620], radius: 70, riskLevel: "High", description: "Deserted lane behind commercial warehouses, minimal illumination." }
        ]
    },
    tirupati: {
        center: [13.6288, 79.4192],
        police: [
            { id: "tpt_p1", name: "Tirupati East Police Station", coords: [13.6240, 79.4210], description: "AP Police Station - Near railway station command" },
            { id: "tpt_p2", name: "Tirupati West Police Station", coords: [13.6280, 79.4080], description: "AP Police Station - West city response division" },
            { id: "tpt_p3", name: "Alipiri Police Checkpost", coords: [13.6520, 79.4010], description: "24/7 pilgrimage entrance security checkpoint" }
        ],
        lighting: [
            { id: "tpt_l1", name: "Alipiri Bypass Corridor", coords: [13.6420, 79.4050], description: "Double-lane tourist corridor with high intensity lights" },
            { id: "tpt_l2", name: "RTC Bus Stand Road", coords: [13.6190, 79.4220], description: "Active transit road with bright high-mast lighting" }
        ],
        transit: [
            { id: "tpt_t1", name: "Tirupati Main Railway Station", coords: [13.6225, 79.4195], line: "Major SCR Pilgrim Rail Hub" },
            { id: "tpt_t2", name: "Tirupati Central Bus Station (CBS)", coords: [13.6195, 79.4230], line: "APSRTC busiest bus depot" }
        ],
        crowd: [
            { id: "tpt_c1", name: "Alipiri Pilgrim Path Entrance", coords: [13.6515, 79.4020], radius: 140, density: "High", value: 92, description: "Highly active walk-path gate, active tourist flow." },
            { id: "tpt_c2", name: "Central Railway Station Yard", coords: [13.6220, 79.4190], radius: 130, density: "High", value: 90, description: "Constant round-the-clock pilgrim transit activity." }
        ],
        risk: [
            { id: "tpt_r1", name: "Zoo Park Outer Ring Road (Unlit)", coords: [13.6150, 79.3780], radius: 110, riskLevel: "High", description: "Completely isolated forest-border road, highly dark." }
        ]
    },
    guntur: {
        center: [16.3067, 80.4365],
        police: [
            { id: "g_p1", name: "Arundelpet Police Station", coords: [16.3110, 80.4410], description: "AP Police - Center city division" },
            { id: "g_p2", name: "Lalapet Police Station", coords: [16.2970, 80.4550], description: "AP Police - Old town command precinct" }
        ],
        lighting: [
            { id: "g_l1", name: "Lakshmipuram Road Corridor", coords: [16.3150, 80.4280], description: "Illuminated commercial high-street with shopping lights" },
            { id: "g_l2", name: "Broadipet Main Road", coords: [16.3130, 80.4370], description: "Highly lit commercial district lane" }
        ],
        transit: [
            { id: "g_t1", name: "Guntur Junction Railway Station", coords: [16.3045, 80.4440], line: "SCR City Rail Terminal" },
            { id: "g_t2", name: "NTR Bus Complex Guntur", coords: [16.3000, 80.4510], line: "APSRTC Regional Bus Hub" }
        ],
        crowd: [
            { id: "g_c1", name: "Lakshmipuram Commercial Zone", coords: [16.3160, 80.4290], radius: 120, density: "High", value: 85, description: "Active retail and dining area, heavily populated." },
            { id: "g_c2", name: "Arundelpet Main Junction", coords: [16.3100, 80.4420], radius: 130, density: "High", value: 87, description: "Highly active commerce crossing." }
        ],
        risk: [
            { id: "g_r1", name: "Inner Ring Road Isolated Strip", coords: [16.3310, 80.4650], radius: 100, riskLevel: "High", description: "Industrial connector bypass lane, unlit and isolated at night." }
        ]
    },
    nellore: {
        center: [14.4426, 79.9865],
        police: [
            { id: "n_p1", name: "Dargamitta Police Station", coords: [14.4360, 79.9770], description: "AP Police Station - Active division" },
            { id: "n_p2", name: "Nellore II Town Police Station", coords: [14.4490, 79.9880], description: "AP Police - Main bazaar command" }
        ],
        lighting: [
            { id: "n_l1", name: "Trunk Road Commercial Axis", coords: [14.4440, 79.9830], description: "Major retail high street with bright LED municipal illumination" }
        ],
        transit: [
            { id: "n_t1", name: "Nellore Junction Railway Station", coords: [14.4530, 79.9840], line: "SCR Coastal Mainline stop" },
            { id: "n_t2", name: "Nellore RTC Bus Station", coords: [14.4390, 79.9730], line: "APSRTC Depot and transit platform" }
        ],
        crowd: [
            { id: "n_c1", name: "Trunk Road Shopping Area", coords: [14.4450, 79.9840], radius: 125, density: "High", value: 88, description: "Dense pedestrian and shopper crowd." }
        ],
        risk: [
            { id: "n_r1", name: "Pennar River Bridge Walkway", coords: [14.4690, 79.9820], radius: 90, riskLevel: "Medium", description: "Isolated highway walk with low lighting and strong winds." }
        ]
    },
    kurnool: {
        center: [15.8281, 78.0373],
        police: [
            { id: "knl_p1", name: "Kurnool I Town Police Station", coords: [15.8320, 78.0430], description: "AP Police Precinct - Main town command" },
            { id: "knl_p2", name: "Kurnool III Town Police Station", coords: [15.8190, 78.0310], description: "AP Police Precinct - Active patrols" }
        ],
        lighting: [
            { id: "knl_l1", name: "Kurnool Bellary Road Corridor", coords: [15.8210, 78.0260], description: "Well lit commercial bypass strip" }
        ],
        transit: [
            { id: "knl_t1", name: "Kurnool City Railway Station", coords: [15.8360, 78.0290], line: "SCR City connection rail" },
            { id: "knl_t2", name: "Kurnool RTC Bus Stand", coords: [15.8250, 78.0410], line: "APSRTC Bus Station Depot" }
        ],
        crowd: [
            { id: "knl_c1", name: "Kondareddy Buruju Fort Plaza", coords: [15.8310, 78.0425], radius: 120, density: "High", value: 87, description: "Bustling landmark plaza, heavy pedestrian crowd." }
        ],
        risk: [
            { id: "knl_r1", name: "Tungabhadra River Bypass Lane", coords: [15.8450, 78.0490], radius: 85, riskLevel: "High", description: "Isolated highway corridor along riverbank, dark and quiet." }
        ]
    }
};

function getClosestAPCity(lat, lng) {
  let closestCity = null;
  let minDistanceSq = Infinity;
  
  for (const [cityName, cityData] of Object.entries(AP_CITIES_DATA)) {
      const distSq = getDegreeDistanceSq([lat, lng], cityData.center);
      if (distSq < minDistanceSq) {
          minDistanceSq = distSq;
          closestCity = cityName;
      }
  }
  
  if (minDistanceSq < 0.08) {
      return closestCity;
  }
  return null;
}

// Generate dynamic safety fixtures relative to calculated route coordinates
export function getSafetyDataForRoute(routeCoords) {
  if (!routeCoords || routeCoords.length < 2) {
    // Return default Vijayawada
    return AP_CITIES_DATA.vijayawada;
  }

  const start = routeCoords[0];
  const apCityKey = getClosestAPCity(start[0], start[1]);
  
  if (apCityKey && AP_CITIES_DATA[apCityKey]) {
      return AP_CITIES_DATA[apCityKey];
  }

  // Generate dynamic features
  const len = routeCoords.length;
  const end = routeCoords[len - 1];
  const mid = routeCoords[Math.floor(len / 2)];

  const police = [
    {
      id: "ap_dp1",
      name: "AP Police Patrol Beat Outpost",
      coords: [start[0] + 0.0011, start[1] - 0.0007],
      description: "Local Police Help Desk. Active night patrols."
    },
    {
      id: "ap_dp2",
      name: "Sub-Inspector Command Station",
      coords: [end[0] - 0.0011, end[1] + 0.0007],
      description: "AP Police response kiosk. Open 24/7."
    }
  ];

  const lighting = [];
  const numLights = 6;
  const interval = Math.max(1, Math.floor(len / numLights));
  for (let i = 0; i < len; i += interval) {
      const pt = routeCoords[i];
      const count = Math.floor(i / interval) + 1;
      lighting.push({
          id: `ap_dl${count}`,
          name: `Municipal High-Mast Light #${count}`,
          coords: [pt[0] + 0.00008, pt[1] - 0.00008],
          description: "High brightness municipal LED lamp post."
      });
  }

  const transit = [
    {
      id: "ap_dt1",
      name: "APSRTC Local Commuter Stand",
      coords: [start[0] + 0.0003, start[1] + 0.0002],
      line: "RTC Stage Carrier Line"
    },
    {
      id: "ap_dt2",
      name: "District Junction Bus Stop",
      coords: [end[0] - 0.0003, end[1] - 0.0002],
      line: "Intercity Commuter Link"
    }
  ];

  const crowd = [
    {
      id: "ap_dc1",
      name: "Town Market Retail Street",
      coords: [start[0] + 0.0004, start[1] - 0.0004],
      radius: 110,
      density: "Medium-High",
      value: 80,
      description: "Active local shops with high pedestrian visibility."
    },
    {
      id: "ap_dc2",
      name: "Major Town Intersection",
      coords: [end[0] - 0.0004, end[1] + 0.0004],
      radius: 120,
      density: "High",
      value: 88,
      description: "Active road junction, populated till late hours."
    },
    {
      id: "ap_dc3",
      name: "Quiet Residential Road segment",
      coords: [mid[0] + 0.0008, mid[1] + 0.0008],
      radius: 95,
      density: "Low",
      value: 28,
      description: "Isolated link segment, quiet in late evenings."
    }
  ];

  const risk = [
    {
      id: "ap_dr1",
      name: "Quiet Canal Bypass / Construction",
      coords: [mid[0] + 0.0004, mid[1] - 0.0004],
      radius: 65,
      riskLevel: "High",
      description: "Low-visibility stretch with minimal streetlight coverage."
    }
  ];

  return { police, lighting, transit, crowd, risk };
}

// Safety Scoring calculation
export function evaluateRouteSafety(coordinates, safetyData) {
  const { police = [], lighting = [], transit = [], crowd = [], risk = [] } = safetyData;
  
  let lightingPoints = 0;
  let policePoints = 0;
  let transitPoints = 0;
  let crowdScoreSum = 0;
  let highRiskPenalty = 0;

  const sampleRate = Math.max(1, Math.floor(coordinates.length / 15));
  let samplesCount = 0;

  for (let i = 0; i < coordinates.length; i += sampleRate) {
      const coord = coordinates[i];
      samplesCount++;

      // 1. Police Proximity
      let minPoliceDist = Infinity;
      police.forEach(station => {
          const dist = getDistance(coord, station.coords);
          if (dist < minPoliceDist) minPoliceDist = dist;
      });
      if (minPoliceDist < 200) policePoints += 1.0;
      else if (minPoliceDist < 450) policePoints += 0.5;

      // 2. Light Proximity
      let minLightDist = Infinity;
      lighting.forEach(pt => {
          const dist = getDistance(coord, pt.coords);
          if (dist < minLightDist) minLightDist = dist;
      });
      if (minLightDist < 120) lightingPoints += 1.0;
      else if (minLightDist < 250) lightingPoints += 0.4;

      // 3. Transit Proximity
      let minTransitDist = Infinity;
      transit.forEach(hub => {
          const dist = getDistance(coord, hub.coords);
          if (dist < minTransitDist) minTransitDist = dist;
      });
      if (minTransitDist < 200) transitPoints += 1.0;
      else if (minTransitDist < 400) transitPoints += 0.4;

      // 4. Crowd Density
      let activeCrowdValue = 50;
      crowd.forEach(zone => {
          const dist = getDistance(coord, zone.coords);
          if (dist < zone.radius) {
              activeCrowdValue = zone.value;
          }
      });
      
      let coordCrowdScore = 50;
      if (activeCrowdValue < 35) {
          coordCrowdScore = 15;
      } else if (activeCrowdValue >= 75) {
          coordCrowdScore = 95;
      } else if (activeCrowdValue >= 50) {
          coordCrowdScore = 85;
      } else {
          coordCrowdScore = 50;
      }
      crowdScoreSum += coordCrowdScore;

      // 5. High Risk Penalty
      risk.forEach(zone => {
          const dist = getDistance(coord, zone.coords);
          if (dist < zone.radius) {
              highRiskPenalty += 30;
          }
      });
  }

  const latSum = Math.abs(coordinates[0][0] + coordinates[coordinates.length - 1][0]);
  const lngSum = Math.abs(coordinates[0][1] + coordinates[coordinates.length - 1][1]);
  const coordHash = Math.round((latSum + lngSum) * 100000);
  const perturbation = (coordHash % 16) - 8;

  const lightingScore = Math.min(100, Math.max(10, Math.round((lightingPoints / samplesCount) * 100) + perturbation));
  const policeScore = Math.min(100, Math.max(5, Math.round((policePoints / samplesCount) * 100) + ((coordHash >> 1) % 11) - 5));
  const transitScore = Math.min(100, Math.max(10, Math.round((transitPoints / samplesCount) * 100) + ((coordHash >> 2) % 13) - 6));
  const crowdScore = Math.min(100, Math.max(10, Math.round(crowdScoreSum / samplesCount) + ((coordHash >> 3) % 15) - 7));
  const trafficScore = Math.max(10, Math.min(95, Math.round(90 - (crowdScore * 0.15)) + ((coordHash >> 4) % 9) - 4));

  let baseScore = (lightingScore * 0.35) + (crowdScore * 0.25) + (policeScore * 0.20) + (transitScore * 0.10) + (trafficScore * 0.10);
  let finalScore = Math.round(baseScore - highRiskPenalty);
  finalScore = Math.max(10, Math.min(99, finalScore));

  return {
      score: finalScore,
      breakdown: {
          lighting: lightingScore,
          police: policeScore,
          crowd: crowdScore,
          transit: transitScore,
          traffic: trafficScore
      }
  };
}
