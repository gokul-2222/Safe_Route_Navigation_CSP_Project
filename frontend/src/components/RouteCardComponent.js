import { formatDuration } from '../tracking/JourneyController.js';

export const RouteCardComponent = {
  render(routes, selectedRouteId, onCardClick) {
    const routeCardsList = document.getElementById("route-cards-list");
    if (!routeCardsList) return;

    routeCardsList.innerHTML = "";
    routes.forEach(route => {
        const isSelected = route.id === selectedRouteId;
        const distKm = (route.distance / 1000).toFixed(1);
        const durationFormatted = formatDuration(route.duration);
        const vehicleFormatted = formatDuration(Math.round(route.duration / 5.5)); // 5.5x faster in vehicle
        
        let scoreClass = "badge-safe";
        if (route.safetyScore < 50) scoreClass = "badge-danger";
        else if (route.safetyScore < 80) scoreClass = "badge-caution";

        const card = document.createElement("div");
        card.className = `route-card ${isSelected ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="route-info">
                <span class="route-title">${route.name}</span>
                <span class="route-meta">
                    <span><i class="fa-solid fa-person-walking"></i> ${durationFormatted}</span>
                    <span><i class="fa-solid fa-car"></i> ${vehicleFormatted}</span>
                    <span><i class="fa-solid fa-arrows-left-right"></i> ${distKm} km</span>
                </span>
            </div>
            <div class="route-score-badge ${scoreClass}">
                ${route.safetyScore}%
            </div>
        `;

        card.addEventListener("click", () => {
            if (onCardClick) {
              onCardClick(route.id);
            }
        });

        routeCardsList.appendChild(card);
    });
  }
};
