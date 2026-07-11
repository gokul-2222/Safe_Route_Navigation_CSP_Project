// SafePath Modular Orchestration Entrypoint
import { AppState, MapState, RouteState, JourneyState, SOSState } from './state/State.js';
import { MapManager } from './map/MapManager.js';
import { MarkerManager } from './map/MarkerManager.js';
import { LayerManager } from './map/LayerManager.js';
import { GeocodingService } from './services/GeocodingService.js';
import { RoutingService } from './services/RoutingService.js';
import { LocationService } from './services/LocationService.js';
import { ShareService } from './services/ShareService.js';
import { RouteController } from './routing/RouteController.js';
import { JourneyController } from './tracking/JourneyController.js';
import { SOSController } from './sos/SOSController.js';
import { ToastComponent } from './components/ToastComponent.js';
import { RouteCardComponent } from './components/RouteCardComponent.js';
import { ContactComponent } from './components/ContactComponent.js';
import { HistoryComponent } from './components/HistoryComponent.js';
import { translatePage, getTranslation, getCurrentLanguage } from './i18n/i18n.js';

// DOM Element cache references
let sourceInput, destInput, sourceSuggestions, destSuggestions;
let btnLocateSource, btnPickDest, btnFindRoutes, btnClearRoutes;
let resultsSection, routeCardsList, safetyAnalysisDetails;
let navTabs, tabPanes, sidebar, toggleSidebarBtn;
let addContactForm, settingsContactsList, compactContactsList;
let trackingInactive, trackingActive, btnShareLink, btnEndJourney, alertFeedList;
let btnSosTrigger, btnQuickSos, btnCancelSos, btnMuteSiren, btnStopSos;
let sosOverlay, sosActiveOverlay, sosCountdownTimer, sosActiveCoords, sosActiveNotifiedList;
let toastBanner, toastMessage;

// Debounce timers
let sourceTimeout = null;
let destTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize DOM references
    initializeDOM();

    // 2. Initialize Contacts & Logs
    SOSController.initContacts();
    renderContactsList();
    renderSOSHistoryList();

    // 3. Initialize Map
    MapManager.init((latlng) => {
        handleMapClick(latlng);
    });

    // 4. Register Drag Callback
    MarkerManager.registerMarkerMovedCallback(handleMarkerDragged);

    // 5. Register Event Handlers
    setupEventHandlers();

    // 6. Language Dropdown binding
    const langSelect = document.getElementById('language-select');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            const lang = e.target.value;
            translatePage(lang);

            if (RouteState.routes.length > 0) {
                renderRouteCards(RouteState.routes);
                const activeRoute = RouteState.routes.find(r => r.id === RouteState.selectedRouteId);
                if (activeRoute) displaySafetyBreakdown(activeRoute);
            }

            renderContactsList();
            renderSOSHistoryList();

            const msgs = { hi: 'भाषा बदल दी गई है।', ta: 'மொழி மாற்றப்பட்டது.', kn: 'ಭಾಷೆಯನ್ನು ಬದಲಾಯಿಸಲಾಗಿದೆ.', te: 'భాష మార్చబడింది.' };
            ToastComponent.show(msgs[lang] || 'Language changed.');
        });
    }

    // 7. Initial load translation
    translatePage('en');

    // 8. Check Spectator Link parameters
    checkUrlParameters();

    // 9. Check active journey to resume
    checkActiveJourneyToResume();
});

// ─── DOM CACHE ───────────────────────────────────────────────────────────────
function initializeDOM() {
    sourceInput = document.getElementById('source-input');
    destInput = document.getElementById('dest-input');
    sourceSuggestions = document.getElementById('source-suggestions');
    destSuggestions = document.getElementById('dest-suggestions');

    btnLocateSource = document.getElementById('btn-locate-source');
    btnPickDest = document.getElementById('btn-pick-dest');
    btnFindRoutes = document.getElementById('btn-find-routes');
    btnClearRoutes = document.getElementById('btn-clear-routes');

    resultsSection = document.getElementById('results-section');
    routeCardsList = document.getElementById('route-cards-list');
    safetyAnalysisDetails = document.getElementById('safety-analysis-details');

    navTabs = document.querySelectorAll('.nav-tab');
    tabPanes = document.querySelectorAll('.tab-pane');
    sidebar = document.getElementById('sidebar');
    toggleSidebarBtn = document.getElementById('toggleSidebar');

    addContactForm = document.getElementById('add-contact-form');
    settingsContactsList = document.getElementById('settings-contacts-list');
    compactContactsList = document.getElementById('sos-contacts-list-preview');

    trackingInactive = document.getElementById('tracking-inactive');
    trackingActive = document.getElementById('tracking-active');
    btnShareLink = document.getElementById('btn-share-link');
    btnEndJourney = document.getElementById('btn-end-journey');
    alertFeedList = document.getElementById('alert-feed-list');

    btnSosTrigger = document.getElementById('btn-sos-trigger');
    btnQuickSos = document.getElementById('btn-quick-sos');
    btnCancelSos = document.getElementById('btn-cancel-sos');
    btnMuteSiren = document.getElementById('btn-mute-siren');
    btnStopSos = document.getElementById('btn-stop-sos');

    sosOverlay = document.getElementById('sos-overlay');
    sosActiveOverlay = document.getElementById('sos-active-overlay');
    sosCountdownTimer = document.getElementById('sos-countdown-timer');
    sosActiveCoords = document.getElementById('sos-active-coords');
    sosActiveNotifiedList = document.getElementById('sos-active-notified-list');

    toastBanner = document.getElementById('toast-banner');
    toastMessage = document.getElementById('toast-message');
}

// ─── EVENT HANDLERS ──────────────────────────────────────────────────────────
function setupEventHandlers() {
    // A. Tab Toggling
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPaneId = tab.getAttribute('data-tab');
            navTabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const pane = document.getElementById(targetPaneId);
            if (pane) pane.classList.add('active');
            closeAllSuggestions();
        });
    });

    // B. Sidebar toggle
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            const icon = toggleSidebarBtn.querySelector('i');
            if (icon) {
                icon.className = sidebar.classList.contains('collapsed')
                    ? 'fa-solid fa-chevron-right'
                    : 'fa-solid fa-chevron-left';
            }
        });
    }

    // C. Search inputs with debounce
    if (sourceInput) {
        sourceInput.addEventListener('input', () => {
            clearTimeout(sourceTimeout);
            const query = sourceInput.value.trim();
            if (query.length < 2) {
                hideSuggestions(sourceSuggestions);
                return;
            }
            showLoadingInSuggestions(sourceSuggestions);
            sourceTimeout = setTimeout(() => fetchGeocoding(query, 'source'), 400);
        });

        sourceInput.addEventListener('focus', () => {
            if (sourceInput.value.trim().length < 2) {
                showRecentSearches('source');
            }
        });
    }

    if (destInput) {
        destInput.addEventListener('input', () => {
            clearTimeout(destTimeout);
            const query = destInput.value.trim();
            if (query.length < 2) {
                hideSuggestions(destSuggestions);
                return;
            }
            showLoadingInSuggestions(destSuggestions);
            destTimeout = setTimeout(() => fetchGeocoding(query, 'dest'), 400);
        });

        destInput.addEventListener('focus', () => {
            if (destInput.value.trim().length < 2) {
                showRecentSearches('dest');
            }
        });
    }

    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.input-group')) {
            closeAllSuggestions();
        }
    });

    // D. Locate Source Button
    if (btnLocateSource) {
        btnLocateSource.addEventListener('click', () => {
            ToastComponent.show('Locating your device position...');
            LocationService.getCurrentLocation()
                .then(latlng => {
                    MapState.sourceCoords = latlng;
                    MapState.sourceAddress = 'My Location';
                    sourceInput.value = 'My Location';
                    MarkerManager.setSource(latlng, 'My Location');
                    MapManager.recenter(latlng, 15);
                    ToastComponent.show('Position located successfully!');
                    reverseGeocode(latlng, 'source');
                })
                .catch(err => {
                    console.warn('Geolocation failed:', err);
                    ToastComponent.show('Location denied. Placing marker at Vijayawada.');
                    const fallback = [16.5062, 80.6480];
                    MapState.sourceCoords = fallback;
                    MapState.sourceAddress = 'Benz Circle, Vijayawada';
                    sourceInput.value = 'Benz Circle, Vijayawada';
                    MarkerManager.setSource(fallback, 'Benz Circle, Vijayawada');
                    MapManager.recenter(fallback, 15);
                });
        });
    }

    // E. Pick Destination from Map Button
    if (btnPickDest) {
        btnPickDest.addEventListener('click', () => {
            MapState.mapPickTarget = 'dest';
            btnPickDest.classList.add('active');
            ToastComponent.show('Click directly on the map to pin destination.');
        });
    }

    // F. Calculate Route Button
    if (btnFindRoutes) {
        btnFindRoutes.addEventListener('click', calculateAndDisplayRoutes);
    }

    // G. Clear Map Button
    if (btnClearRoutes) {
        btnClearRoutes.addEventListener('click', resetRoutingState);
    }

    // H. Recenter Map
    const btnRecenter = document.getElementById('btn-recenter-map');
    if (btnRecenter) {
        btnRecenter.addEventListener('click', () => {
            const center = MapState.sourceCoords || MapState.currentLocation;
            MapManager.recenter(center, 15);
            ToastComponent.show('Centered map view.');
        });
    }

    // I. SOS Triggers
    if (btnQuickSos) btnQuickSos.addEventListener('click', activateSOSOverlay);
    if (btnSosTrigger) btnSosTrigger.addEventListener('click', activateSOSOverlay);
    if (btnCancelSos) btnCancelSos.addEventListener('click', deactivateSOSCountdown);

    if (btnMuteSiren) {
        btnMuteSiren.addEventListener('click', () => {
            const muted = SOSController.toggleSirenMute();
            btnMuteSiren.innerHTML = muted
                ? `<i class="fa-solid fa-volume-high"></i> Unmute Siren`
                : `<i class="fa-solid fa-volume-xmark"></i> Mute Siren`;
            ToastComponent.show(muted ? 'Siren alarm muted.' : 'Siren alarm active!');
        });
    }

    if (btnStopSos) {
        btnStopSos.addEventListener('click', stopSOSMode);
    }

    // J. Contacts Form
    if (addContactForm) {
        addContactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('contact-name');
            const phoneInput = document.getElementById('contact-phone');
            const name = nameInput.value.trim();
            const phone = phoneInput.value.trim();

            const indianPhonePattern = /^[6-9]\d{9}$/;
            if (!name) {
                ToastComponent.show('Please enter a contact name.');
                return;
            }
            if (!indianPhonePattern.test(phone)) {
                ToastComponent.show('Please enter a valid 10-digit Indian number starting with 6, 7, 8, or 9.');
                return;
            }

            SOSController.addContact(name, phone);
            nameInput.value = '';
            phoneInput.value = '';
            renderContactsList();
            ToastComponent.show('Emergency contact added.');
        });
    }

    // K. Journey Start & End
    const btnStartJourney = document.getElementById('btn-start-journey');
    if (btnStartJourney) btnStartJourney.addEventListener('click', initiateJourneyTracking);
    if (btnEndJourney) btnEndJourney.addEventListener('click', endJourneyTracking);
    if (btnShareLink) btnShareLink.addEventListener('click', shareLiveJourneyLink);

    // L. Settings Layer Toggles
    const toggleHeatmap = document.getElementById('toggle-heatmap');
    const toggleLighting = document.getElementById('toggle-lighting');
    const togglePolice = document.getElementById('toggle-police');
    const toggleGoogleTiles = document.getElementById('toggle-google-tiles');

    if (toggleHeatmap) toggleHeatmap.addEventListener('change', (e) => LayerManager.toggleLayer('heatmap', e.target.checked));
    if (toggleLighting) toggleLighting.addEventListener('change', (e) => LayerManager.toggleLayer('lighting', e.target.checked));
    if (togglePolice) togglePolice.addEventListener('change', (e) => LayerManager.toggleLayer('police', e.target.checked));
    if (toggleGoogleTiles) {
        toggleGoogleTiles.addEventListener('change', (e) => {
            MapManager.setTileStyle(e.target.checked ? 'google' : 'dark');
            ToastComponent.show(e.target.checked ? 'Map style set to Google Maps.' : 'Map style set to Dark Mode.');
        });
    }
}

// ─── SUGGESTIONS HELPERS ─────────────────────────────────────────────────────
function showLoadingInSuggestions(el) {
    if (!el) return;
    el.innerHTML = `<div class="suggestion-item suggestion-loading"><i class="fa-solid fa-spinner fa-spin"></i> Searching...</div>`;
    el.style.display = 'block';
}

function hideSuggestions(el) {
    if (!el) return;
    el.style.display = 'none';
    el.innerHTML = '';
}

function closeAllSuggestions() {
    hideSuggestions(sourceSuggestions);
    hideSuggestions(destSuggestions);
}

function showRecentSearches(target) {
    const recents = GeocodingService.getRecentSearches();
    if (recents.length === 0) return;

    const el = target === 'source' ? sourceSuggestions : destSuggestions;
    if (!el) return;

    el.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'suggestion-item suggestion-header';
    header.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> Recent Searches`;
    el.appendChild(header);

    recents.slice(0, 5).forEach(item => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        const parts = item.display_name.split(',');
        div.innerHTML = `<i class="fa-solid fa-history" style="opacity:0.5;margin-right:6px;font-size:0.75rem;"></i>${parts.slice(0, 3).join(', ')}`;
        div.addEventListener('click', () => {
            const coords = [parseFloat(item.lat), parseFloat(item.lon)];
            selectLocation(coords, item.display_name, target);
        });
        el.appendChild(div);
    });
    el.style.display = 'block';
}

// ─── GEOCODING ────────────────────────────────────────────────────────────────
async function fetchGeocoding(query, target) {
    const el = target === 'source' ? sourceSuggestions : destSuggestions;
    if (!el) return;

    try {
        const data = await GeocodingService.search(query);

        el.innerHTML = '';

        if (!data || data.length === 0) {
            el.innerHTML = `<div class="suggestion-item suggestion-empty"><i class="fa-solid fa-map-pin"></i> No results found for "${query}"</div>`;
            el.style.display = 'block';
            return;
        }

        // Deduplicate by display_name
        const seen = new Set();
        const unique = data.filter(item => {
            if (seen.has(item.display_name)) return false;
            seen.add(item.display_name);
            return true;
        });

        unique.slice(0, 8).forEach(item => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            const parts = item.display_name.split(',');
            const shortName = parts.slice(0, 3).join(',');
            div.innerText = shortName;
            div.addEventListener('click', () => {
                const coords = [parseFloat(item.lat), parseFloat(item.lon)];
                selectLocation(coords, item.display_name, target);
                GeocodingService.saveRecentSearch(item.display_name, item.lat, item.lon);
            });
            el.appendChild(div);
        });

        el.style.display = 'block';
    } catch (e) {
        console.warn('Geocoding failed:', e);
        el.innerHTML = `<div class="suggestion-item suggestion-empty"><i class="fa-solid fa-circle-exclamation"></i> Search unavailable. Try again.</div>`;
        el.style.display = 'block';
    }
}

async function reverseGeocode(latlng, target) {
    try {
        const lat = Array.isArray(latlng) ? latlng[0] : latlng.lat;
        const lon = Array.isArray(latlng) ? latlng[1] : latlng.lng;

        const data = await GeocodingService.reverse(lat, lon);

        if (data && data.display_name) {
            const parts = data.display_name.split(',');
            const shortName = parts[0].trim() + (parts[1] ? ', ' + parts[1].trim() : '');

            if (target === 'source') {
                sourceInput.value = shortName;
                MapState.sourceAddress = shortName;
                MarkerManager.updatePopup('source', shortName);
            } else {
                destInput.value = shortName;
                MapState.destAddress = shortName;
                MarkerManager.updatePopup('dest', shortName);
            }
        }
    } catch (e) {
        console.warn('Reverse geocoding failed:', e);
    }
}

function selectLocation(coords, address, target) {
    closeAllSuggestions();
    const parts = address.split(',');
    const displayAddress = parts[0].trim() + (parts[1] ? ', ' + parts[1].trim() : '');

    if (target === 'source') {
        MapState.sourceCoords = coords;
        MapState.sourceAddress = address;
        sourceInput.value = displayAddress;
        MarkerManager.setSource(coords, displayAddress);
        MapManager.recenter(coords, 15);
    } else {
        MapState.destCoords = coords;
        MapState.destAddress = address;
        destInput.value = displayAddress;
        MarkerManager.setDestination(coords, displayAddress);
        MapManager.recenter(coords, 15);
    }
}

// ─── MAP HANDLERS ─────────────────────────────────────────────────────────────
function handleMapClick(latlng) {
    closeAllSuggestions();

    if (MapState.mapPickTarget === 'dest') {
        MapState.destCoords = [latlng.lat, latlng.lng];
        MarkerManager.setDestination([latlng.lat, latlng.lng], 'Selected Point');
        reverseGeocode([latlng.lat, latlng.lng], 'dest');
        btnPickDest.classList.remove('active');
        MapState.mapPickTarget = null;
        ToastComponent.show('Destination point set.');
    } else if (!MapState.sourceCoords) {
        MapState.sourceCoords = [latlng.lat, latlng.lng];
        MarkerManager.setSource([latlng.lat, latlng.lng], 'Selected Point');
        reverseGeocode([latlng.lat, latlng.lng], 'source');
        ToastComponent.show('Start point set. Now click to set destination or search above.');
    } else if (!MapState.destCoords) {
        MapState.destCoords = [latlng.lat, latlng.lng];
        MarkerManager.setDestination([latlng.lat, latlng.lng], 'Selected Point');
        reverseGeocode([latlng.lat, latlng.lng], 'dest');
        ToastComponent.show('Destination point set.');
    }
}

function handleMarkerDragged(type, latlng) {
    const coords = [latlng.lat, latlng.lng];
    if (type === 'source') {
        MapState.sourceCoords = coords;
        reverseGeocode(coords, 'source');
    } else {
        MapState.destCoords = coords;
        reverseGeocode(coords, 'dest');
    }
}

// ─── ROUTE CALCULATION ────────────────────────────────────────────────────────
async function calculateAndDisplayRoutes() {
    if (!MapState.sourceCoords || !MapState.destCoords) {
        ToastComponent.show('Error: Set both start and destination points.');
        return;
    }

    ToastComponent.show('Evaluating route safety...');
    if (resultsSection) resultsSection.style.display = 'none';
    if (btnFindRoutes) {
        btnFindRoutes.disabled = true;
        btnFindRoutes.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Calculating...';
    }

    try {
        const routes = await RouteController.findRoutes(MapState.sourceCoords, MapState.destCoords, selectRoute);
        if (routes && routes.length > 0) {
            displaySafetyBreakdown(routes[0]);
            renderRouteCards(routes);
            if (resultsSection) resultsSection.style.display = 'block';
            ToastComponent.show(`Found ${routes.length} route(s). Safest route selected.`);
        } else {
            ToastComponent.show('No routes found between these points.');
        }
    } catch (e) {
        console.error('Route calculation error:', e);
        ToastComponent.show('Error computing routing pathways. Please try again.');
    } finally {
        if (btnFindRoutes) {
            btnFindRoutes.disabled = false;
            btnFindRoutes.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Calculate Safe Routes';
        }
    }
}

function renderRouteCards(routes) {
    RouteCardComponent.render(routes, RouteState.selectedRouteId, selectRoute);
}

function selectRoute(routeId) {
    const activeRoute = RouteController.selectRoute(routeId, selectRoute);
    if (activeRoute) {
        displaySafetyBreakdown(activeRoute);
        renderRouteCards(RouteState.routes);
    }
}

function displaySafetyBreakdown(route) {
    if (!route || !route.breakdown) return;

    const detailEl = document.getElementById('safety-analysis-details');
    const levelEl = document.getElementById('analysis-safety-level');
    if (!detailEl || !levelEl) return;

    detailEl.style.display = 'block';

    const lang = getCurrentLanguage();
    let pillClass = 'safety-pill-safe';
    let levelKey = 'safe-level';

    if (route.safetyScore < 50) {
        pillClass = 'safety-pill-danger';
        levelKey = 'danger-level';
    } else if (route.safetyScore < 80) {
        pillClass = 'safety-pill-caution';
        levelKey = 'caution-level';
    }

    levelEl.className = `safety-pill ${pillClass}`;
    levelEl.innerText = getTranslation(levelKey, lang);

    const setFactor = (id, barId, score, highKey, midKey, lowKey) => {
        const el = document.getElementById(id);
        const bar = document.getElementById(barId);
        if (el) el.innerText = score > 75 ? getTranslation(highKey, lang) : score > 50 ? getTranslation(midKey, lang) : getTranslation(lowKey, lang);
        if (bar) {
            bar.style.width = `${score}%`;
            bar.style.backgroundColor = getScoreColor(score);
        }
    };

    setFactor('factor-lighting', 'bar-lighting', route.breakdown.lighting, 'excellent', 'standard', 'dark-corner');
    setFactor('factor-crowd', 'bar-crowd', route.breakdown.crowd, 'populated', 'optimal-crowd', 'isolated');
    setFactor('factor-police', 'bar-police', route.breakdown.police, 'active-patrol', 'nearby-station', 'unpatrolled');
    setFactor('factor-transit', 'bar-transit', route.breakdown.transit, 'adjacent', 'short-walk', 'limited');
    setFactor('factor-traffic', 'bar-traffic', route.breakdown.traffic, 'bustling', 'moderate', 'no-vehicles');
}

function getScoreColor(score) {
    if (score > 75) return 'var(--color-safe)';
    if (score > 45) return 'var(--color-caution)';
    return 'var(--color-danger)';
}

function resetRoutingState() {
    MarkerManager.clearSearchMarkers();
    RouteController.reset();

    MapState.sourceCoords = null;
    MapState.destCoords = null;
    MapState.sourceAddress = '';
    MapState.destAddress = '';

    if (sourceInput) sourceInput.value = '';
    if (destInput) destInput.value = '';
    if (resultsSection) resultsSection.style.display = 'none';
    if (safetyAnalysisDetails) safetyAnalysisDetails.style.display = 'none';

    closeAllSuggestions();
    ToastComponent.show('Map layers cleared.');
}

// ─── SPECTATOR / URL PARAMS ───────────────────────────────────────────────────
function checkUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const tripId = params.get('tripId');
    const routeId = params.get('routeId');

    if (tripId) {
        ToastComponent.show(`ENTERING SPECTATOR TRACKING: ${tripId}`, 5000);

        ShareService.getSharedJourney(tripId)
            .then(journey => {
                const routes = journey.routes;
                RouteState.routes = routes;
                const targetRoute = routes.find(r => r.id === routeId) || routes[0];

                MapState.sourceCoords = targetRoute.coordinates[0];
                MapState.destCoords = targetRoute.coordinates[targetRoute.coordinates.length - 1];

                MarkerManager.setSource(MapState.sourceCoords, 'Journey Start');
                MarkerManager.setDestination(MapState.destCoords, 'Journey End');

                RoutingService.getSafetyZones(targetRoute.coordinates)
                    .then(safetyData => {
                        RouteState.activeSafetyData = safetyData;
                        LayerManager.populateSafetyLayers(safetyData);
                        selectRoute(targetRoute.id);
                        initiateJourneyTracking();
                        if (btnFindRoutes) btnFindRoutes.disabled = true;
                        if (btnClearRoutes) btnClearRoutes.disabled = true;
                        const searchSection = document.querySelector('.search-section');
                        if (searchSection) {
                            searchSection.style.opacity = '0.7';
                            searchSection.style.pointerEvents = 'none';
                        }
                    })
                    .catch(err => console.warn('Safety zones error in spectator mode:', err));
            })
            .catch(err => {
                console.warn('Failed to load shared journey:', err);
                ToastComponent.show('Error fetching shared journey. Loading demo...');
            });
    }
}

// ─── JOURNEY TRACKING ─────────────────────────────────────────────────────────
function checkActiveJourneyToResume() {
    const activeStr = localStorage.getItem('safepath_active_journey');
    if (!activeStr) return;

    try {
        const journeyState = JSON.parse(activeStr);
        const route = journeyState.route;
        const safetyData = journeyState.safetyData;

        if (!route || !route.coordinates || route.coordinates.length < 2) {
            localStorage.removeItem('safepath_active_journey');
            return;
        }

        RouteState.routes = [route];
        RouteState.selectedRouteId = route.id;
        MapState.sourceCoords = route.coordinates[0];
        MapState.destCoords = route.coordinates[route.coordinates.length - 1];
        MapState.sourceAddress = 'Start Point';
        MapState.destAddress = 'Destination';

        MarkerManager.setSource(MapState.sourceCoords, 'Start Point');
        MarkerManager.setDestination(MapState.destCoords, 'Destination');
        selectRoute(route.id);

        if (safetyData) LayerManager.populateSafetyLayers(safetyData);

        // Switch to tracking tab
        navTabs.forEach(t => t.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        const trackingTabBtn = document.querySelector('[data-tab="tracking-tab"]');
        const trackingTabPane = document.getElementById('tracking-tab');
        if (trackingTabBtn) trackingTabBtn.classList.add('active');
        if (trackingTabPane) trackingTabPane.classList.add('active');

        if (trackingInactive) trackingInactive.style.display = 'none';
        if (trackingActive) trackingActive.style.display = 'block';

        const safetyStatusEl = document.getElementById('track-safety-status');
        if (safetyStatusEl) {
            safetyStatusEl.innerText = 'SECURE';
            safetyStatusEl.className = 'stat-value text-safe';
        }

        if (alertFeedList) {
            alertFeedList.innerHTML = `<div class="feed-item"><i class="fa-solid fa-rotate text-info"></i><span>Journey state restored from browser history.</span></div>`;
        }

        startJourney(route, safetyData, journeyState.currentCoordsIndex || 0);
    } catch (e) {
        console.error('Failed to restore active journey:', e);
        localStorage.removeItem('safepath_active_journey');
    }
}

function initiateJourneyTracking() {
    const selectedRoute = RouteState.routes.find(r => r.id === RouteState.selectedRouteId);
    if (!selectedRoute) {
        ToastComponent.show('Please calculate a route first.');
        return;
    }

    navTabs.forEach(t => t.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));
    const trackingTabBtn = document.querySelector('[data-tab="tracking-tab"]');
    const trackingTabPane = document.getElementById('tracking-tab');
    if (trackingTabBtn) trackingTabBtn.classList.add('active');
    if (trackingTabPane) trackingTabPane.classList.add('active');

    if (trackingInactive) trackingInactive.style.display = 'none';
    if (trackingActive) trackingActive.style.display = 'block';

    const safetyStatusEl = document.getElementById('track-safety-status');
    if (safetyStatusEl) {
        safetyStatusEl.innerText = 'SECURE';
        safetyStatusEl.className = 'stat-value text-safe';
    }
    const progressEl = document.getElementById('track-progress');
    if (progressEl) progressEl.style.width = '0%';

    if (alertFeedList) {
        alertFeedList.innerHTML = `<div class="feed-item"><i class="fa-solid fa-circle-info text-info"></i><span>Journey initiated. Safety systems online.</span></div>`;
    }

    startJourney(selectedRoute, RouteState.activeSafetyData, 0);
}

function startJourney(route, safetyData, resumeIndex) {
    JourneyController.start(
        route,
        safetyData,
        (pct, remDurationFormatted, remDistFormatted) => {
            const progressEl = document.getElementById('track-progress');
            const etaEl = document.getElementById('track-eta');
            const distEl = document.getElementById('track-distance');
            if (progressEl) progressEl.style.width = `${pct}%`;
            if (etaEl) etaEl.innerText = remDurationFormatted;
            if (distEl) distEl.innerText = remDistFormatted;
        },
        (message, type) => {
            addAlertToFeed(message, type);
            ToastComponent.show(message);
        },
        () => {
            ToastComponent.show('Destination reached! Safe journey completed.', 5000);
            addAlertToFeed('Safe journey completed. Map markers released.', 'safe');
            endJourneyTracking();
        },
        resumeIndex
    );
}

function addAlertToFeed(msg, type) {
    if (!alertFeedList) return;
    const div = document.createElement('div');
    div.className = 'feed-item';

    let icon = 'fa-circle-info text-info';
    if (type === 'safe') icon = 'fa-shield-halved text-safe';
    if (type === 'danger') icon = 'fa-triangle-exclamation text-danger';

    div.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
    alertFeedList.appendChild(div);
    alertFeedList.scrollTop = alertFeedList.scrollHeight;
}

function endJourneyTracking() {
    JourneyController.stop();
    if (trackingInactive) trackingInactive.style.display = 'block';
    if (trackingActive) trackingActive.style.display = 'none';
    ToastComponent.show('Journey tracker terminated.');
}

// ─── SHARING ──────────────────────────────────────────────────────────────────
async function shareLiveJourneyLink() {
    if (!RouteState.selectedRouteId || RouteState.routes.length === 0) {
        ToastComponent.show('No active route to share.');
        return;
    }

    try {
        const trackingInfo = await ShareService.shareJourney(RouteState.selectedRouteId, RouteState.routes);
        const absoluteUrl = `${window.location.origin}${trackingInfo.url}`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(absoluteUrl);
            ToastComponent.show(`Live link copied! ID: ${trackingInfo.id}`, 4000);
        } else {
            // Fallback for browsers without clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = absoluteUrl;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            ToastComponent.show(`Live link copied! ID: ${trackingInfo.id}`, 4000);
        }
    } catch (err) {
        console.warn('Share journey error:', err);
        ToastComponent.show('Error generating sharing link. Please try again.');
    }
}

// ─── SOS ─────────────────────────────────────────────────────────────────────
function activateSOSOverlay() {
    if (!sosOverlay) return;
    sosOverlay.classList.add('show');

    SOSController.startCountdown(3,
        (timeLeft) => {
            if (sosCountdownTimer) sosCountdownTimer.innerText = timeLeft;
        },
        () => {
            triggerActiveSOS();
        }
    );
}

function deactivateSOSCountdown() {
    SOSController.cancelCountdown();
    if (sosOverlay) sosOverlay.classList.remove('show');
    ToastComponent.show('SOS alert cancelled.');
}

function triggerActiveSOS() {
    if (sosOverlay) sosOverlay.classList.remove('show');
    if (sosActiveOverlay) sosActiveOverlay.style.display = 'flex';

    SOSController.startEmergencySiren();

    const currentLoc = MapState.sourceCoords || MapState.currentLocation || [16.5062, 80.6480];
    if (sosActiveCoords) {
        sosActiveCoords.innerText = `LAT: ${currentLoc[0].toFixed(5)}, LNG: ${currentLoc[1].toFixed(5)}`;
    }

    const contacts = SOSController.getContacts();
    if (sosActiveNotifiedList) {
        sosActiveNotifiedList.innerHTML = '';
        if (contacts.length === 0) {
            sosActiveNotifiedList.innerHTML = `<li><i class="fa-solid fa-triangle-exclamation" style="color: var(--color-caution)"></i> No safety contacts configured.</li>`;
        } else {
            contacts.forEach(c => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="fa-solid fa-check"></i> Alert SMS dispatched to <strong>${c.name}</strong> (${c.phone})`;
                sosActiveNotifiedList.appendChild(li);
            });
        }
    }

    SOSController.logSOSAlert(
        currentLoc,
        MapState.sourceAddress || 'Benz Circle, Vijayawada'
    );

    ToastComponent.show('CRITICAL: SOS BEACON ACTIVATED', 5000);
}

function stopSOSMode() {
    SOSController.stopEmergencySiren();
    if (sosActiveOverlay) sosActiveOverlay.style.display = 'none';
    renderSOSHistoryList();
    ToastComponent.show('SOS Alert deactivated.');
}

// ─── CONTACTS & HISTORY ───────────────────────────────────────────────────────
function renderContactsList() {
    const contacts = SOSController.getContacts();
    ContactComponent.render(contacts, (idx) => {
        SOSController.removeContact(idx);
        renderContactsList();
        ToastComponent.show('Emergency contact removed.');
    });
}

function renderSOSHistoryList() {
    const logs = SOSController.getSOSLogs();
    HistoryComponent.render(logs);
}
