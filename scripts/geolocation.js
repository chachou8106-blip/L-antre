// Gestion de la géolocalisation pour L'Antre

let userLat = null;
let userLng = null;

/**
 * Initialise la géolocalisation
 */
function initGeolocation() {
  if (navigator.geolocation) {
    showNotification('Activation de la géolocalisation...', 'info');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
        filters.location.lat = userLat;
        filters.location.lng = userLng;
        filters.location.city = null; // Réinitialiser la ville si on utilise le GPS
        document.getElementById('city-input').value = '';
        enableSearchButton();
        showNotification('Géolocalisation activée avec succès !', 'success');
        console.log(`Position obtenue: ${userLat}, ${userLng}`);
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error);
        let errorMessage = 'Impossible d\'obtenir votre position.';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'La géolocalisation a été refusée. Utilisez une ville manuellement.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'La position est indisponible. Essayez plus tard.';
            break;
          case error.TIMEOUT:
            errorMessage = 'La demande de géolocalisation a expiré. Essayez à nouveau.';
            break;
        }
        
        showNotification(errorMessage, 'error');
        document.getElementById('city-input').focus();
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 0 
      }
    );
  } else {
    showNotification('La géolocalisation n\'est pas supportée par votre navigateur.', 'error');
  }
}

/**
 * Active le bouton de recherche si une localisation est disponible
 */
function enableSearchButton() {
  const searchButton = document.getElementById('search-button');
  if (!searchButton) return;
  
  const hasLocation = filters.location.lat !== null || filters.location.city !== null;
  searchButton.disabled = !hasLocation;
}

/**
 * Met à jour la localisation manuelle
 */
function updateManualLocation() {
  filters.location.city = document.getElementById('city-input').value;
  filters.location.lat = null;
  filters.location.lng = null;
  enableSearchButton();
  
  if (filters.location.city) {
    showNotification(`Localisation définie sur: ${filters.location.city}`, 'success');
  }
}

// Écouteurs d'événements
document.addEventListener('DOMContentLoaded', () => {
  const useGpsButton = document.getElementById('use-gps');
  const cityInput = document.getElementById('city-input');
  
  if (useGpsButton) {
    useGpsButton.addEventListener('click', initGeolocation);
  }
  
  if (cityInput) {
    cityInput.addEventListener('change', updateManualLocation);
    cityInput.addEventListener('input', () => {
      if (cityInput.value.trim() === '') {
        filters.location.city = null;
        enableSearchButton();
      }
    });
  }
});

// Exporter les variables et fonctions pour les autres scripts
window.userLat = userLat;
window.userLng = userLng;
window.initGeolocation = initGeolocation;
window.enableSearchButton = enableSearchButton;
window.updateManualLocation = updateManualLocation;
