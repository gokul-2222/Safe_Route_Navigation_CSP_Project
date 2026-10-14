export async function sendMessage(req, res, next) {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Missing or invalid parameter: message'
      });
    }

    const query = message.toLowerCase().trim();
    let reply = "";

    if (query.includes('help') || query.includes('sos') || query.includes('emergency')) {
      reply = "🚨 **Emergency Protocols**:\n1. Press and hold the **SOS button** (red shield/button) to activate the wailing siren alarm.\n2. This will notify your registered contacts via simulated SMS with your live coordinates.\n3. Quick dial hotlines: **Police/ERSS (100)**, **Women Helpline (181)**, or **Ambulance (108)**.";
    } else if (query.includes('lighting') || query.includes('lit') || query.includes('dark') || query.includes('street')) {
      reply = "💡 **Street Lighting & Corridor Safety**:\n- Well-lit paths are highlighted on the map. You can toggle the **Well-Lit Corridors** overlay under settings.\n- SafePath's safety engine ranks routes higher if they have high lighting scores to keep you in visible areas.";
    } else if (query.includes('police') || query.includes('cop') || query.includes('station') || query.includes('patrol')) {
      reply = "👮 **Police Presence**:\n- Police stations are plotted as blue icons on the map (toggleable via **Show Police Stations** settings).\n- Routing safety calculations heavily weight proximity to police stations to design pathways close to active safety anchors.";
    } else if (query.includes('transit') || query.includes('bus') || query.includes('metro') || query.includes('stop')) {
      reply = "🚌 **Public Transit Hubs**:\n- Transit centers, bus stops, and stations are shown on the map.\n- Proximity to transit hubs contributes positively to the route safety score because of increased crowd levels and surveillance.";
    } else if (query.includes('walk') || query.includes('vehicle') || query.includes('car') || query.includes('drive') || query.includes('mode')) {
      reply = "🚗 **Travel Mode Selection**:\n- You can choose **Walk** or **Vehicle** mode before calculating your route.\n- **Walk Mode** calculates paths using walking shortcuts and paths, while **Vehicle Mode** calculates driving routes. The tracking simulator will update its speed and tracking icon (car/walker) based on your selection!";
    } else if (query.includes('how to') || query.includes('start') || query.includes('guide') || query.includes('instructions')) {
      reply = "🗺️ **Quick Start Guide**:\n1. Choose your **Travel Mode** (Walk or Vehicle) at the top of the sidebar.\n2. Set your **Starting Point** (or use your current location).\n3. Set your **Destination** by typing or clicking the map pin icon.\n4. Click **Calculate Safe Routes**.\n5. Select a route card (Safest, Fastest, or Alternative) and click **Start Safest Journey** to begin live tracking.";
    } else if (query.includes('score') || query.includes('factor') || query.includes('calculate')) {
      reply = "📊 **Safety Scoring System**:\n- Routes are evaluated out of 100 points based on four major metrics: **Street Lighting** (35%), **Crowd Density** (25%), **Police Patrols** (20%), and **Transit/Traffic Proximity** (20%).\n- Safest route is always highlighted automatically.";
    } else {
      reply = "👋 Hello! I am your SafePath Safety Assistant.\n\nYou can ask me questions like:\n- *How do I trigger an SOS alert?*\n- *How are safety scores calculated?*\n- *How can I switch to vehicle mode?*\n- *How to view police stations on the map?*";
    }

    res.json({
      status: 'success',
      data: {
        reply: reply
      }
    });
  } catch (error) {
    next(error);
  }
}
