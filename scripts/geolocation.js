let userLat = null, userLng = null;

function initGeolocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
        filters.location.lat = userLat;
        filters.location.lng = userLng;
        enableSearchButton();
        showNotification('Géolocalisation activée !', 'success');
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error);
        showNotification('Impossible d\'obtenir votre position. Utilisez une ville manuellement.', 'error');
      }
    );
  } else {
    showNotification('La géolocalisation n\'est pas supportée par votre navigateur.', 'error');
  }
}

function enableSearchButton() {
  const hasLocation = filters.location.lat !== null || filters.location.city !== null;
  document.getElementById('search-button').disabled = !hasLocation;
}

document.getElementById('use-gps').addEventListener('click', initGeolocation);
document.getElementById('city-input').addEventListener('change', () => {
  filters.location.city = document.getElementById('city-input').value;
  enableSearchButton();
});

window.userLat = userLat;
window.userLng = userLng;