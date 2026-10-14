export const RoutingService = {
  async getRoutes(source, destination, mode = 'walk') {
    const res = await fetch('/api/v1/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ source, destination, mode })
    });
    if (!res.ok) throw new Error('Routing computation failed');
    const body = await res.json();
    return body.data || [];
  },

  async getSafetyZones(coordinates) {
    const res = await fetch('/api/v1/safety/zones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ coordinates })
    });
    if (!res.ok) throw new Error('Safety resource query failed');
    const body = await res.json();
    return body.data || { police: [], lighting: [], transit: [], crowd: [], risk: [] };
  }
};
