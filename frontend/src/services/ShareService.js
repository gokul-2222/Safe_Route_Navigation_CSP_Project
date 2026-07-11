export const ShareService = {
  async shareJourney(routeId, routes) {
    const res = await fetch('/api/v1/journeys/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ routeId, routes })
    });
    if (!res.ok) throw new Error('Failed to register journey for sharing');
    const body = await res.json();
    return body.data;
  },

  async getSharedJourney(id) {
    const res = await fetch(`/api/v1/journeys/${id}`);
    if (!res.ok) throw new Error(`Shared journey ${id} not found`);
    const body = await res.json();
    return body.data;
  }
};
