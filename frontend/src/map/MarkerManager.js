import { MapState } from '../state/State.js';

let markerMoveCallback = null;

export const MarkerManager = {
  registerMarkerMovedCallback(cb) {
    markerMoveCallback = cb;
  },

  setSource(latlng, label = 'Start Point') {
    if (MapState.sourceMarker) {
      MapState.mapInstance.removeLayer(MapState.sourceMarker);
      MapState.sourceMarker = null;
    }
    
    const icon = L.divIcon({
      className: 'safety-marker',
      html: `<div class="marker-inner" style="background-color: var(--color-primary); border-color: white;"><i class="fa-solid fa-location-dot"></i></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    MapState.sourceMarker = L.marker(latlng, { icon, draggable: true })
      .addTo(MapState.mapInstance)
      .bindPopup(`<strong>Starting Point</strong><br>${label}`);

    MapState.sourceMarker.on('dragend', function () {
      const newLatLng = MapState.sourceMarker.getLatLng();
      if (markerMoveCallback) {
        markerMoveCallback('source', newLatLng);
      }
    });

    return MapState.sourceMarker;
  },

  setDestination(latlng, label = 'Destination') {
    if (MapState.destMarker) {
      MapState.mapInstance.removeLayer(MapState.destMarker);
      MapState.destMarker = null;
    }

    const icon = L.divIcon({
      className: 'safety-marker',
      html: `<div class="marker-inner" style="background-color: var(--color-danger); border-color: white;"><i class="fa-solid fa-flag-checkered"></i></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    MapState.destMarker = L.marker(latlng, { icon, draggable: true })
      .addTo(MapState.mapInstance)
      .bindPopup(`<strong>Destination</strong><br>${label}`);

    MapState.destMarker.on('dragend', function () {
      const newLatLng = MapState.destMarker.getLatLng();
      if (markerMoveCallback) {
        markerMoveCallback('dest', newLatLng);
      }
    });

    return MapState.destMarker;
  },

  /**
   * Update the popup text of an existing source or destination marker.
   */
  updatePopup(type, label) {
    if (type === 'source' && MapState.sourceMarker) {
      MapState.sourceMarker.setPopupContent(`<strong>Starting Point</strong><br>${label}`);
    } else if (type === 'dest' && MapState.destMarker) {
      MapState.destMarker.setPopupContent(`<strong>Destination</strong><br>${label}`);
    }
  },

  clearSearchMarkers() {
    if (MapState.sourceMarker) {
      MapState.mapInstance.removeLayer(MapState.sourceMarker);
      MapState.sourceMarker = null;
    }
    if (MapState.destMarker) {
      MapState.mapInstance.removeLayer(MapState.destMarker);
      MapState.destMarker = null;
    }
  }
};
