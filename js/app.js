// SafePath Main Orchestration Application
import { 
    initMap, 
    getMap,
    recenterMap, 
    setSourceMarker, 
    setDestinationMarker, 
    clearSearchMarkers, 
    toggleLayer,
    registerMarkerMovedCallback,
    repopulateSafetyLayers,
    setMapTileStyle
} from './map.js';
import { getRoutes, drawRoutesOnMap, formatDuration } from './routing.js';
import { setDynamicSafetyData } from './mockData.js';
import { 
    initContacts, 
    getContacts, 
    addContact, 
    removeContact, 
    startSOSCountdown, 
    cancelSOSCountdown, 
    startEmergencySiren, 
    stopEmergencySiren, 
    toggleSirenMute, 
    logSOSAlert, 
    getSOSLogs 
} from './sos.js';
import { startJourneySimulation, stopJourneySimulation, generateTrackingLink } from './sharing.js';
import { translatePage, getTranslation, getCurrentLanguage } from './i18n.js';

// Application State
const state = {
    sourceCoords: null,
    sourceAddress: "",
    destCoords: null,
    destAddress: "",
    mapPickTarget: null, // 'source' or 'dest'
    routes: [],
    selectedRouteId: null,
    activeJourneyRoute: null,
    isSirenMuted: false,
    currentLocation: [16.5062, 80.6480] // Default Vijayawada, AP
};

// DOM Elements
let sourceInput, destInput, sourceSuggestions, destSuggestions;
let btnLocateSource, btnPickDest, btnFindRoutes, btnClearRoutes;
let resultsSection, routeCardsList, safetyAnalysisDetails;
let navTabs, tabPanes, sidebar, toggleSidebarBtn;
let addContactForm, settingsContactsList, compactContactsList;
let trackingInactive, trackingActive, btnShareLink, btnEndJourney, alertFeedList;
let btnSosTrigger, btnQuickSos, btnCancelSos, btnMuteSiren, btnStopSos;
let sosOverlay, sosActiveOverlay, sosCountdownTimer, sosActiveCoords, sosActiveNotifiedList;
let toastBanner, toastMessage;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize DOM references
    initializeDOM();

    // 2. Load LocalStorage items (Contacts, Logs)
    initContacts();
    renderContactsList();
    renderSOSHistoryList();

    // 3. Initialize Map
    initMap((latlng) => {
        handleMapClick(latlng);
    });

    // 4. Register Drag Callback
    registerMarkerMovedCallback(handleMarkerDragged);

    // 5. Register Event Listeners
    setupEventHandlers();

    // i18n Translation selector binding
    const langSelect = document.getElementById("language-select");
    langSelect.addEventListener("change", (e) => {
        const lang = e.target.value;
        translatePage(lang);
        
        // Retranslate active dynamic panels if populated
        if (state.routes.length > 0) {
            renderRouteCards(state.routes);
            const activeRoute = state.routes.find(r => r.id === state.selectedRouteId);
            if (activeRoute) displaySafetyBreakdown(activeRoute);
        }
        
        // Translate contacts lists
        renderContactsList();
        renderSOSHistoryList();

        const toastMsg = lang === 'hi' ? "भाषा बदल दी गई है।" : lang === 'ta' ? "மொழி மாற்றப்பட்டது." : lang === 'kn' ? "ಭಾಷೆಯನ್ನು ಬದಲಾಯಿಸಲಾಗಿದೆ." : lang === 'te' ? "భాష మార్చబడింది." : "Language changed.";
        showToast(toastMsg);
    });
    
    // Initial load translation
    translatePage('en');

    // 6. Check Spectator Link parameters
    checkUrlParameters();

    // 7. Check active journey to resume
    checkActiveJourneyToResume();
});

// Initialize DOM cache
function initializeDOM() {
    sourceInput = document.getElementById("source-input");
    destInput = document.getElementById("dest-input");
    sourceSuggestions = document.getElementById("source-suggestions");
    destSuggestions = document.getElementById("dest-suggestions");
    
    btnLocateSource = document.getElementById("btn-locate-source");
    btnPickDest = document.getElementById("btn-pick-dest");
    btnFindRoutes = document.getElementById("btn-find-routes");
    btnClearRoutes = document.getElementById("btn-clear-routes");
    
    resultsSection = document.getElementById("results-section");
    routeCardsList = document.getElementById("route-cards-list");
    safetyAnalysisDetails = document.getElementById("safety-analysis-details");
    
    navTabs = document.querySelectorAll(".nav-tab");
    tabPanes = document.querySelectorAll(".tab-pane");
    sidebar = document.getElementById("sidebar");
    toggleSidebarBtn = document.getElementById("toggleSidebar");

    addContactForm = document.getElementById("add-contact-form");
    settingsContactsList = document.getElementById("settings-contacts-list");
    compactContactsList = document.getElementById("sos-contacts-list-preview");

    trackingInactive = document.getElementById("tracking-inactive");
    trackingActive = document.getElementById("tracking-active");
    btnShareLink = document.getElementById("btn-share-link");
    btnEndJourney = document.getElementById("btn-end-journey");
    alertFeedList = document.getElementById("alert-feed-list");

    btnSosTrigger = document.getElementById("btn-sos-trigger");
    btnQuickSos = document.getElementById("btn-quick-sos");
    btnCancelSos = document.getElementById("btn-cancel-sos");
    btnMuteSiren = document.getElementById("btn-mute-siren");
    btnStopSos = document.getElementById("btn-stop-sos");

    sosOverlay = document.getElementById("sos-overlay");
    sosActiveOverlay = document.getElementById("sos-active-overlay");
    sosCountdownTimer = document.getElementById("sos-countdown-timer");
    sosActiveCoords = document.getElementById("sos-active-coords");
    sosActiveNotifiedList = document.getElementById("sos-active-notified-list");

    toastBanner = document.getElementById("toast-banner");
    toastMessage = document.getElementById("toast-message");
}

// Setup Event Handlers
function setupEventHandlers() {
    // A. Tab Toggling
    navTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const targetPaneId = tab.getAttribute("data-tab");
            
            navTabs.forEach(t => t.classList.remove("active"));
            tabPanes.forEach(p => p.classList.remove("active"));

            tab.classList.add("active");
            document.getElementById(targetPaneId).classList.add("active");

            // Close suggestions
            closeAllSuggestions();
        });
    });

    // B. Collapsible Sidebar
    toggleSidebarBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        const icon = toggleSidebarBtn.querySelector("i");
        if (sidebar.classList.contains("collapsed")) {
            icon.className = "fa-solid fa-chevron-right";
        } else {
            icon.className = "fa-solid fa-chevron-left";
        }
    });

    // C. Search Inputs Geocoding (Nominatim API with debounce)
    let sourceTimeout, destTimeout;
    
    sourceInput.addEventListener("input", () => {
        clearTimeout(sourceTimeout);
        const query = sourceInput.value.trim();
        if (query.length < 3) {
            sourceSuggestions.style.display = "none";
            return;
        }
        sourceTimeout = setTimeout(() => fetchGeocoding(query, 'source'), 400);
    });

    destInput.addEventListener("input", () => {
        clearTimeout(destTimeout);
        const query = destInput.value.trim();
        if (query.length < 3) {
            destSuggestions.style.display = "none";
            return;
        }
        destTimeout = setTimeout(() => fetchGeocoding(query, 'dest'), 400);
    });

    // D. Locate Source Button
    btnLocateSource.addEventListener("click", () => {
        showToast("Locating your device position...");
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const latlng = [pos.coords.latitude, pos.coords.longitude];
                    state.sourceCoords = latlng;
                    state.sourceAddress = "My Location";
                    sourceInput.value = "My Location";
                    setSourceMarker(latlng, "My Location");
                    recenterMap(latlng, 15);
                    showToast("Position located successfully!");
                    
                    // Trigger reverse lookup in background
                    reverseGeocode(latlng, 'source');
                },
                (err) => {
                    console.warn(err);
                    showToast("Location denied. Placing marker at Vijayawada.");
                    const fallback = [16.5062, 80.6480];
                    state.sourceCoords = fallback;
                    state.sourceAddress = "Benz Circle, Vijayawada";
                    sourceInput.value = "Benz Circle, Vijayawada";
                    setSourceMarker(fallback, "Benz Circle, Vijayawada");
                    recenterMap(fallback, 15);
                }
            );
        } else {
            showToast("Geolocation is not supported by your browser.");
        }
    });

    // E. Pick Destination from Map Button
    btnPickDest.addEventListener("click", () => {
        state.mapPickTarget = 'dest';
        btnPickDest.classList.add("active");
        showToast("Click directly on the map to pin destination.");
    });

    // F. Calculate Route Button
    btnFindRoutes.addEventListener("click", calculateAndDisplayRoutes);

    // G. Clear Map Button
    btnClearRoutes.addEventListener("click", resetRoutingState);

    // H. Recenter Map Floating Control
    document.getElementById("btn-recenter-map").addEventListener("click", () => {
        const center = state.sourceCoords || state.currentLocation;
        recenterMap(center, 15);
        showToast("Centered map view.");
    });

    // I. SOS Triggers (Quick action and Big center Button)
    btnQuickSos.addEventListener("click", activateSOSOverlay);
    
    // Hold trigger mechanism
    btnSosTrigger.addEventListener("click", activateSOSOverlay);

    btnCancelSos.addEventListener("click", deactivateSOSCountdown);
    
    btnMuteSiren.addEventListener("click", () => {
        const muted = toggleSirenMute();
        state.isSirenMuted = muted;
        btnMuteSiren.innerHTML = muted ? 
            `<i class="fa-solid fa-volume-high"></i> Unmute Siren` : 
            `<i class="fa-solid fa-volume-xmark"></i> Mute Siren`;
        showToast(muted ? "Siren alarm muted." : "Siren alarm active!");
    });

    btnStopSos.addEventListener("click", stopSOSMode);

    // J. Contacts Form Submission
    addContactForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const nameInput = document.getElementById("contact-name");
        const phoneInput = document.getElementById("contact-phone");
        
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        
        // Validate 10-digit Indian mobile numbers
        const indianPhonePattern = /^[6-9]\d{9}$/;
        if (!indianPhonePattern.test(phone)) {
            showToast("Please enter a valid 10-digit Indian number starting with 6, 7, 8, or 9.");
            return;
        }
        
        if (name && phone) {
            addContact(name, phone);
            nameInput.value = "";
            phoneInput.value = "";
            renderContactsList();
            showToast("Emergency contact added.");
        }
    });

    // K. Journey Start & End
    document.getElementById("btn-start-journey").addEventListener("click", initiateJourneyTracking);
    btnEndJourney.addEventListener("click", endJourneyTracking);
    btnShareLink.addEventListener("click", shareLiveJourneyLink);

    // L. Settings Layer Toggles
    document.getElementById("toggle-heatmap").addEventListener("change", (e) => {
        toggleLayer('heatmap', e.target.checked);
    });
    document.getElementById("toggle-lighting").addEventListener("change", (e) => {
        toggleLayer('lighting', e.target.checked);
    });
    document.getElementById("toggle-police").addEventListener("change", (e) => {
        toggleLayer('police', e.target.checked);
    });
    document.getElementById("toggle-google-tiles").addEventListener("change", (e) => {
        setMapTileStyle(e.target.checked ? 'google' : 'dark');
        showToast(e.target.checked ? "Map style set to Google Maps." : "Map style set to Dark Mode.");
    });

    // M. Global route selected listener (from clicking polylines on map)
    window.addEventListener("routeSelected", (e) => {
        selectRoute(e.detail);
    });
}

// Check URL Params for Live Track mode
function checkUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get('tripId');
    const routeId = params.get('routeId');

    if (tripId) {
        showToast(`ENTERING SPECTATOR TRACKING: ${tripId}`, 5000);
        
        // Setup direct spectator mode
        // Set mock locations
        const src = [16.5185, 80.6210]; // Vijayawada Junction Railway Station
        const dst = [16.5062, 80.6635]; // Benz Circle, Vijayawada
        
        state.sourceCoords = src;
        state.destCoords = dst;
        
        setSourceMarker(src, "Vijayawada Railway Station");
        setDestinationMarker(dst, "Benz Circle");

        // Fetch routes
        getRoutes(src, dst).then(routes => {
            state.routes = routes;
            const targetRoute = routes.find(r => r.id === routeId) || routes[0];
            selectRoute(targetRoute.id);
            drawRoutesOnMap(routes, targetRoute.id);
            
            // Auto start spectator tracking simulation
            initiateJourneyTracking();
            
            // Mask controls to prevent spectator altering search
            btnFindRoutes.disabled = true;
            btnClearRoutes.disabled = true;
            document.querySelector(".search-section").style.opacity = "0.7";
            document.querySelector(".search-section").style.pointerEvents = "none";
        });
    }
}

// Fetch geocoding candidates
async function fetchGeocoding(query, target) {
    const suggestionsEl = target === 'source' ? sourceSuggestions : destSuggestions;
    
    // Search globally with no bounding box limitation
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        suggestionsEl.innerHTML = "";
        if (data.length === 0) {
            suggestionsEl.style.display = "none";
            return;
        }

        data.forEach(item => {
            const div = document.createElement("div");
            div.className = "suggestion-item";
            
            // Clean up name: first 3 segments
            const parts = item.display_name.split(",");
            const shortName = parts.slice(0, 3).join(",");
            
            div.innerText = shortName;
            div.addEventListener("click", () => {
                const coords = [parseFloat(item.lat), parseFloat(item.lon)];
                selectLocation(coords, item.display_name, target);
            });
            suggestionsEl.appendChild(div);
        });
        suggestionsEl.style.display = "block";
    } catch (e) {
        console.warn("Geocoding failed, falling back to mock search", e);
    }
}

// Reverse Geocode (LatLng -> Address)
async function reverseGeocode(latlng, target) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng[0]}&lon=${latlng[1]}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.display_name) {
            const shortName = data.display_name.split(",")[0] + ", " + (data.display_name.split(",")[1] || "");
            if (target === 'source') {
                sourceInput.value = shortName;
                state.sourceAddress = shortName;
            } else {
                destInput.value = shortName;
                state.destAddress = shortName;
            }
        }
    } catch (e) {
        console.warn(e);
    }
}

// Select Location from Geocode suggestions
function selectLocation(coords, address, target) {
    closeAllSuggestions();
    
    const parts = address.split(",");
    const displayAddress = parts[0] + (parts[1] ? ", " + parts[1].trim() : "");
    
    if (target === 'source') {
        state.sourceCoords = coords;
        state.sourceAddress = address;
        sourceInput.value = displayAddress;
        setSourceMarker(coords, address);
        recenterMap(coords, 15);
    } else {
        state.destCoords = coords;
        state.destAddress = address;
        destInput.value = displayAddress;
        setDestinationMarker(coords, address);
        recenterMap(coords, 15);
    }
}

// Close suggestion overlays
function closeAllSuggestions() {
    sourceSuggestions.style.display = "none";
    destSuggestions.style.display = "none";
}

// Map Click Handler
function handleMapClick(latlng) {
    closeAllSuggestions();
    
    // Default to setting source if source is empty, else dest
    if (!state.sourceCoords) {
        state.sourceCoords = [latlng.lat, latlng.lng];
        setSourceMarker([latlng.lat, latlng.lng], "Selected Point");
        reverseGeocode([latlng.lat, latlng.lng], 'source');
        showToast("Start point set.");
    } else if (!state.destCoords || state.mapPickTarget === 'dest') {
        state.destCoords = [latlng.lat, latlng.lng];
        setDestinationMarker([latlng.lat, latlng.lng], "Selected Point");
        reverseGeocode([latlng.lat, latlng.lng], 'dest');
        btnPickDest.classList.remove("active");
        state.mapPickTarget = null;
        showToast("Destination point set.");
    }
}

// Handle Drag Events
function handleMarkerDragged(type, latlng) {
    const coords = [latlng.lat, latlng.lng];
    if (type === 'source') {
        state.sourceCoords = coords;
        reverseGeocode(coords, 'source');
    } else {
        state.destCoords = coords;
        reverseGeocode(coords, 'dest');
    }
}

// Calculate and Display routes
async function calculateAndDisplayRoutes() {
    if (!state.sourceCoords || !state.destCoords) {
        showToast("Error: Set both start and destination points.");
        return;
    }

    showToast("Evaluating route safety...");
    resultsSection.style.display = "none";

    try {
        const routes = await getRoutes(state.sourceCoords, state.destCoords);
        state.routes = routes;
        
        // Dynamically spawn and refresh safety anchors (prioritizing women safety parameters)
        setDynamicSafetyData(routes[0].coordinates);
        repopulateSafetyLayers();

        // Auto select safest (first index after sorting)
        selectRoute(routes[0].id);
        
        // Draw all routes on map
        drawRoutesOnMap(routes, routes[0].id);
        
        // Render Cards
        renderRouteCards(routes);
        
        resultsSection.style.display = "block";
        
        // Pan map bounds to fit the routes
        const bounds = L.latLngBounds([state.sourceCoords, state.destCoords]);
        getMap().fitBounds(bounds, { padding: [50, 50] });

    } catch (e) {
        showToast("Error computing routing pathways.");
        console.error(e);
    }
}

// Render route selection cards
function renderRouteCards(routes) {
    routeCardsList.innerHTML = "";
    routes.forEach(route => {
        const isSelected = route.id === state.selectedRouteId;
        const distKm = (route.distance / 1000).toFixed(1);
        const durationFormatted = formatDuration(route.duration);
        const vehicleFormatted = formatDuration(Math.round(route.duration / 5.5)); // 5.5x faster in vehicle
        
        // Determine score class
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
            selectRoute(route.id);
        });

        routeCardsList.appendChild(card);
    });
}

// Select a specific route
function selectRoute(routeId) {
    state.selectedRouteId = routeId;
    
    // Update card selection active states
    const cards = document.querySelectorAll(".route-card");
    state.routes.forEach((route, idx) => {
        if (route.id === routeId) {
            if (cards[idx]) cards[idx].classList.add("selected");
            displaySafetyBreakdown(route);
            // Redraw line weights
            drawRoutesOnMap(state.routes, routeId);
        } else {
            if (cards[idx]) cards[idx].classList.remove("selected");
        }
    });
}

// Display Safety breakdown statistics
function displaySafetyBreakdown(route) {
    const detailEl = document.getElementById("safety-analysis-details");
    const levelEl = document.getElementById("analysis-safety-level");
    
    detailEl.style.display = "block";
    
    // Level rating label class - with i18n support
    const lang = getCurrentLanguage();
    let pillClass = "safety-pill-safe";
    let levelKey = "safe-level";
    
    if (route.safetyScore < 50) {
        pillClass = "safety-pill-danger";
        levelKey = "danger-level";
    } else if (route.safetyScore < 80) {
        pillClass = "safety-pill-caution";
        levelKey = "caution-level";
    }

    levelEl.className = `safety-pill ${pillClass}`;
    levelEl.innerText = getTranslation(levelKey, lang);

    // Progress updates with i18n translation support
    document.getElementById("factor-lighting").innerText = route.breakdown.lighting > 75 ? getTranslation('excellent', lang) : route.breakdown.lighting > 50 ? getTranslation('standard', lang) : getTranslation('dark-corner', lang);
    document.getElementById("bar-lighting").style.width = `${route.breakdown.lighting}%`;
    document.getElementById("bar-lighting").style.backgroundColor = getScoreColor(route.breakdown.lighting);

    document.getElementById("factor-crowd").innerText = route.breakdown.crowd > 75 ? getTranslation('populated', lang) : route.breakdown.crowd > 45 ? getTranslation('optimal-crowd', lang) : getTranslation('isolated', lang);
    document.getElementById("bar-crowd").style.width = `${route.breakdown.crowd}%`;
    document.getElementById("bar-crowd").style.backgroundColor = getScoreColor(route.breakdown.crowd);

    document.getElementById("factor-police").innerText = route.breakdown.police > 70 ? getTranslation('active-patrol', lang) : route.breakdown.police > 40 ? getTranslation('nearby-station', lang) : getTranslation('unpatrolled', lang);
    document.getElementById("bar-police").style.width = `${route.breakdown.police}%`;
    document.getElementById("bar-police").style.backgroundColor = getScoreColor(route.breakdown.police);

    document.getElementById("factor-transit").innerText = route.breakdown.transit > 70 ? getTranslation('adjacent', lang) : route.breakdown.transit > 40 ? getTranslation('short-walk', lang) : getTranslation('limited', lang);
    document.getElementById("bar-transit").style.width = `${route.breakdown.transit}%`;
    document.getElementById("bar-transit").style.backgroundColor = getScoreColor(route.breakdown.transit);

    document.getElementById("factor-traffic").innerText = route.breakdown.traffic > 75 ? getTranslation('bustling', lang) : route.breakdown.traffic > 45 ? getTranslation('moderate', lang) : getTranslation('no-vehicles', lang);
    document.getElementById("bar-traffic").style.width = `${route.breakdown.traffic}%`;
    document.getElementById("bar-traffic").style.backgroundColor = getScoreColor(route.breakdown.traffic);
}

function getScoreColor(score) {
    if (score > 75) return "var(--color-safe)";
    if (score > 45) return "var(--color-caution)";
    return "var(--color-danger)";
}

// Reset Routing state on map
function resetRoutingState() {
    clearSearchMarkers();
    if (routeLayer) routeLayer.clearLayers();
    
    state.sourceCoords = null;
    state.destCoords = null;
    state.routes = [];
    state.selectedRouteId = null;

    sourceInput.value = "";
    destInput.value = "";
    resultsSection.style.display = "none";
    safetyAnalysisDetails.style.display = "none";

    showToast("Map layers cleared.");
}

// Check and resume active journey simulation on page load/refresh
function checkActiveJourneyToResume() {
    const activeStr = localStorage.getItem('safepath_active_journey');
    if (activeStr) {
        try {
            const journeyState = JSON.parse(activeStr);
            const route = journeyState.route;
            
            // Re-establish state
            state.routes = [route];
            state.selectedRouteId = route.id;
            state.activeJourneyRoute = route;
            state.sourceCoords = route.coordinates[0];
            state.destCoords = route.coordinates[route.coordinates.length - 1];
            state.sourceAddress = "Start Point";
            state.destAddress = "Destination";
            
            // Re-draw on map
            setSourceMarker(state.sourceCoords, "Start Point");
            setDestinationMarker(state.destCoords, "Destination");
            drawRoutesOnMap([route], route.id);
            
            // Switch tabs visually to Tracking tab
            navTabs.forEach(t => t.classList.remove("active"));
            tabPanes.forEach(p => p.classList.remove("active"));

            const trackingTab = document.querySelector('[data-tab="tracking-tab"]');
            if (trackingTab) trackingTab.classList.add("active");
            const trackingPane = document.getElementById("tracking-tab");
            if (trackingPane) trackingPane.classList.add("active");

            // Toggle active journey panels
            trackingInactive.style.display = "none";
            trackingActive.style.display = "block";
            
            document.getElementById("track-safety-status").innerText = "SECURE";
            document.getElementById("track-safety-status").className = "stat-value text-safe";
            
            alertFeedList.innerHTML = `
                <div class="feed-item">
                    <i class="fa-solid fa-rotate text-info"></i>
                    <span>Journey state restored from browser history.</span>
                </div>
            `;

            // Start simulation from saved index
            startJourneySimulation(
                route,
                // On progress callback
                (pct, remDurationFormatted, remDistFormatted) => {
                    document.getElementById("track-progress").style.width = `${pct}%`;
                    document.getElementById("track-eta").innerText = remDurationFormatted;
                    const distEl = document.getElementById("track-distance");
                    if (distEl) distEl.innerText = remDistFormatted;
                },
                // On safety alert milestone
                (message, type) => {
                    addAlertToFeed(message, type);
                    showToast(message);
                },
                // On finished route
                () => {
                    showToast("Destination reached! Safe journey completed.", 5000);
                    addAlertToFeed("Safe journey completed. Map markers released.", "safe");
                    endJourneyTracking();
                },
                journeyState.currentCoordsIndex
            );
        } catch (e) {
            console.error("Failed to restore active journey:", e);
            localStorage.removeItem('safepath_active_journey');
        }
    }
}

// Initiate Journey Tracking View
function initiateJourneyTracking() {
    const selectedRoute = state.routes.find(r => r.id === state.selectedRouteId);
    if (!selectedRoute) return;

    state.activeJourneyRoute = selectedRoute;

    // 1. Switch to Tracking tab
    navTabs.forEach(t => t.classList.remove("active"));
    tabPanes.forEach(p => p.classList.remove("active"));

    const trackingTab = document.querySelector('[data-tab="tracking-tab"]');
    trackingTab.classList.add("active");
    document.getElementById("tracking-tab").classList.add("active");

    // 2. Setup Active state HTML
    trackingInactive.style.display = "none";
    trackingActive.style.display = "block";

    document.getElementById("track-safety-status").innerText = "SECURE";
    document.getElementById("track-safety-status").className = "stat-value text-safe";
    document.getElementById("track-progress").style.width = "0%";
    
    // Clear alerts feed
    alertFeedList.innerHTML = `
        <div class="feed-item">
            <i class="fa-solid fa-circle-info text-info"></i>
            <span>Journey initiated. Safety systems online.</span>
        </div>
    `;

    // 3. Initiate tracking simulator loops
    startJourneySimulation(
        selectedRoute,
        // On progress callback
        (pct, remDurationFormatted, remDistFormatted) => {
            document.getElementById("track-progress").style.width = `${pct}%`;
            document.getElementById("track-eta").innerText = remDurationFormatted;
            const distEl = document.getElementById("track-distance");
            if (distEl) distEl.innerText = remDistFormatted;
        },
        // On safety alert milestone
        (message, type) => {
            addAlertToFeed(message, type);
            showToast(message);
        },
        // On finished route
        () => {
            showToast("Destination reached! Safe journey completed.", 5000);
            addAlertToFeed("Safe journey completed. Map markers released.", "safe");
            endJourneyTracking();
        }
    );
}

function addAlertToFeed(msg, type) {
    const div = document.createElement("div");
    div.className = "feed-item";
    
    let icon = "fa-circle-info text-info";
    if (type === 'safe') icon = "fa-shield-halved text-safe";
    if (type === 'danger') icon = "fa-triangle-exclamation text-danger";

    div.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${msg}</span>
    `;
    
    alertFeedList.appendChild(div);
    alertFeedList.scrollTop = alertFeedList.scrollHeight;
}

// End Journey Tracking
function endJourneyTracking() {
    stopJourneySimulation();
    
    trackingInactive.style.display = "block";
    trackingActive.style.display = "none";
    state.activeJourneyRoute = null;

    showToast("Journey tracker terminated.");
}

// Share Live tracking link
function shareLiveJourneyLink() {
    if (!state.selectedRouteId) return;
    const trackingInfo = generateTrackingLink(state.selectedRouteId);
    
    navigator.clipboard.writeText(trackingInfo.url).then(() => {
        showToast(`Live link copied to clipboard! ID: ${trackingInfo.id}`, 4000);
    }).catch(err => {
        showToast("Error copying link to clipboard.");
    });
}

// SOS Full Screen overlays
function activateSOSOverlay() {
    sosOverlay.classList.add("show");
    
    startSOSCountdown(3, 
        (timeLeft) => {
            sosCountdownTimer.innerText = timeLeft;
        },
        () => {
            // Completed without cancellation
            triggerActiveSOS();
        }
    );
}

function deactivateSOSCountdown() {
    cancelSOSCountdown();
    sosOverlay.classList.remove("show");
    showToast("SOS alert cancelled.");
}

// Triggers actual active alarm state
function triggerActiveSOS() {
    sosOverlay.classList.remove("show");
    sosActiveOverlay.style.display = "flex";

    // 1. Play wailing siren audio using oscillator synthesis
    startEmergencySiren();

    // 2. Fetch/Simulate Coordinates in box
    const currentLoc = state.sourceCoords || state.currentLocation;
    sosActiveCoords.innerText = `LAT: ${currentLoc[0].toFixed(5)}, LNG: ${currentLoc[1].toFixed(5)}`;

    // 3. Populate Contacts listing
    const contacts = getContacts();
    sosActiveNotifiedList.innerHTML = "";
    
    if (contacts.length === 0) {
        sosActiveNotifiedList.innerHTML = `<li><i class="fa-solid fa-triangle-exclamation" style="color: var(--color-caution)"></i> No safety contacts configured.</li>`;
    } else {
        contacts.forEach(c => {
            const li = document.createElement("li");
            li.innerHTML = `<i class="fa-solid fa-check"></i> Alert SMS dispatched to <strong>${c.name}</strong> (${c.phone})`;
            sosActiveNotifiedList.appendChild(li);
        });
    }

    // 4. Log alert
    logSOSAlert(
        { lat: currentLoc[0], lng: currentLoc[1] },
        state.sourceAddress || "Benz Circle, Vijayawada"
    );

    showToast("CRITICAL: SOS BEACON ACTIVATED", 5000);
}

// Mute Siren / Deactivate SOS
function stopSOSMode() {
    stopEmergencySiren();
    sosActiveOverlay.style.display = "none";
    
    // Refresh history
    renderSOSHistoryList();
    showToast("SOS Alert deactivated.");
}

// Render emergency contact cards in Settings & SOS list preview
function renderContactsList() {
    const contacts = getContacts();
    
    // A. Settings Page Contacts list
    settingsContactsList.innerHTML = "";
    if (contacts.length === 0) {
        settingsContactsList.innerHTML = `<div class="empty-state">No emergency contacts saved.</div>`;
    } else {
        contacts.forEach((contact, idx) => {
            const card = document.createElement("div");
            card.className = "contact-card";
            card.innerHTML = `
                <div class="contact-details">
                    <span class="contact-name">${contact.name}</span>
                    <span class="contact-phone">${contact.phone}</span>
                </div>
                <button class="btn-remove-contact" data-index="${idx}" title="Delete Contact">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            
            // Delete Action
            card.querySelector(".btn-remove-contact").addEventListener("click", () => {
                removeContact(idx);
                renderContactsList();
                showToast("Emergency contact removed.");
            });

            settingsContactsList.appendChild(card);
        });
    }

    // B. SOS Tab preview list
    compactContactsList.innerHTML = "";
    if (contacts.length === 0) {
        compactContactsList.innerHTML = `<span class="empty-state">No contacts configured. Go to Settings.</span>`;
    } else {
        contacts.forEach(c => {
            const span = document.createElement("span");
            span.className = "compact-contact-badge";
            span.innerHTML = `<i class="fa-solid fa-user-shield"></i> ${c.name}`;
            compactContactsList.appendChild(span);
        });
    }
}

// Render SOS History Log Items
function renderSOSHistoryList() {
    const logs = getSOSLogs();
    const logContainer = document.getElementById("sos-history-log");
    
    logContainer.innerHTML = "";
    if (logs.length === 0) {
        logContainer.innerHTML = `<div class="empty-state">No recent SOS triggers. Stay safe!</div>`;
    } else {
        logs.forEach(log => {
            const date = new Date(log.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " | " + date.toLocaleDateString();
            
            const div = document.createElement("div");
            div.className = "history-item";
            div.innerHTML = `
                <div>
                    <strong>SOS Signal Sent</strong><br>
                    <span style="font-size: 0.75rem; opacity: 0.8;">Location: ${log.address}</span>
                </div>
                <span class="history-time">${timeStr}</span>
            `;
            logContainer.appendChild(div);
        });
    }
}

// Toast Notifications Banner Manager
function showToast(message, duration = 3000) {
    toastMessage.innerText = message;
    toastBanner.classList.add("show");
    
    // Auto collapse after duration
    setTimeout(() => {
        toastBanner.classList.remove("show");
    }, duration);
}
