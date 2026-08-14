let userLat = null, userLng = null;

function initGeolocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
        filters.location.lat = userLat;
        filters.location.lng = userLng;
        document.getElementById('search-button').disabled = false;
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error);
        document.getElementById('city-input').focus();
      }
    );
  }
}

document.getElementById('use-gps').addEventListener('click', initGeolocation);
document.getElementById('city-input').addEventListener('change', () => {
  filters.location.city = document.getElementById('city-input').value;
  document.getElementById('search-button').disabled = !filters.location.city;
});