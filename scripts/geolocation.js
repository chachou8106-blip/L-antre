// Géolocalisation : position GPS ou ville saisie manuellement.

/**
 * Convertit des coordonnées en nom de ville (Nominatim / OpenStreetMap).
 * Utile car les moteurs de recherche des sources ont besoin d'un nom de lieu,
 * pas de coordonnées.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string|null>}
 */
async function reverseGeocode(lat, lng) {
  const url = 'https://nominatim.openstreetmap.org/reverse'
    + `?format=jsonv2&zoom=10&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;

  try {
    const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 6000);
    if (!response.ok) return null;

    const data = await response.json();
    const address = data.address || {};
    return address.city || address.town || address.village
      || address.municipality || address.county || null;
  } catch (error) {
    console.warn('Géocodage inverse indisponible :', error);
    return null;
  }
}

/**
 * Convertit un nom de ville en coordonnées (Nominatim / OpenStreetMap).
 * Nécessaire pour interroger les sources qui raisonnent en coordonnées, comme
 * la recherche de lieux.
 * @param {string} city
 * @param {string} [country] - Code pays ISO pour lever les ambiguïtés.
 * @returns {Promise<{lat: number, lng: number}|null>}
 */
async function forwardGeocode(city, country) {
  if (!city) return null;

  const url = 'https://nominatim.openstreetmap.org/search'
    + `?format=jsonv2&limit=1&q=${encodeURIComponent(city)}`
    + (country ? `&countrycodes=${encodeURIComponent(country)}` : '');

  try {
    const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 6000);
    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || !data.length) return null;

    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (error) {
    console.warn('Géocodage indisponible :', error);
    return null;
  }
}

/**
 * Distance à vol d'oiseau entre deux points, en kilomètres (formule de haversine).
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number}
 */
function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = degrees => (degrees * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}

/**
 * Garantit des coordonnées pour la recherche : position GPS si disponible,
 * sinon géocodage de la ville saisie.
 * @returns {Promise<{lat: number, lng: number}|null>}
 */
async function ensureCoordinates() {
  if (filters.location.lat !== null && filters.location.lng !== null) {
    return { lat: filters.location.lat, lng: filters.location.lng };
  }

  const found = await forwardGeocode(filters.location.city, filters.location.country);
  if (found) {
    filters.location.lat = found.lat;
    filters.location.lng = found.lng;
  }
  return found;
}

/**
 * Demande la position GPS et l'enregistre dans les filtres.
 */
function initGeolocation() {
  if (!navigator.geolocation) {
    showNotification('La géolocalisation n\'est pas supportée par ce navigateur.', 'error');
    return;
  }

  showNotification('Demande de position en cours…', 'info');

  navigator.geolocation.getCurrentPosition(
    async position => {
      filters.location.lat = position.coords.latitude;
      filters.location.lng = position.coords.longitude;
      enableSearchButton();
      showNotification('Position obtenue.', 'success');

      const city = await reverseGeocode(filters.location.lat, filters.location.lng);
      if (city) {
        filters.location.city = city;
        const cityInput = document.getElementById('city-input');
        if (cityInput) cityInput.value = city;
        showNotification(`Zone détectée : ${city}.`, 'success');
      } else {
        showNotification('Ville non identifiée : saisis-la pour de meilleurs résultats.', 'warning');
      }
      enableSearchButton();
    },
    error => {
      const messages = {
        [error.PERMISSION_DENIED]: 'Géolocalisation refusée. Saisis une ville à la place.',
        [error.POSITION_UNAVAILABLE]: 'Position indisponible. Saisis une ville à la place.',
        [error.TIMEOUT]: 'La demande de position a expiré. Réessaie ou saisis une ville.'
      };
      showNotification(messages[error.code] || 'Impossible d\'obtenir la position.', 'error');
      document.getElementById('city-input')?.focus();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

/**
 * Active le bouton de recherche dès qu'une localisation est connue.
 */
function enableSearchButton() {
  const button = document.getElementById('search-button');
  if (!button) return;
  button.disabled = !(filters.location.lat !== null || filters.location.city);
}

/**
 * Prend en compte la ville saisie manuellement.
 */
function updateManualLocation() {
  const input = document.getElementById('city-input');
  if (!input) return;

  const city = input.value.trim();
  filters.location.city = city || null;

  // Une saisie manuelle remplace la position GPS.
  if (city) {
    filters.location.lat = null;
    filters.location.lng = null;
  }

  enableSearchButton();
}

window.initGeolocation = initGeolocation;
window.enableSearchButton = enableSearchButton;
window.updateManualLocation = updateManualLocation;
window.reverseGeocode = reverseGeocode;
window.forwardGeocode = forwardGeocode;
window.ensureCoordinates = ensureCoordinates;
window.distanceKm = distanceKm;
