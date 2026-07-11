import { MapState } from '../state/State.js';

export const LocationService = {
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation not supported by this browser'));
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          resolve(coords);
        },
        (err) => {
          reject(err);
        }
      );
    });
  }
};
