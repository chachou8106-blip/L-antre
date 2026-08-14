document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('search-button').addEventListener('click', searchAll);
  document.getElementById('refresh-button').addEventListener('click', searchAll);
  document.getElementById('clear-results').addEventListener('click', () => {
    document.getElementById('results').innerHTML = '<p class="no-results">Aucun résultat à afficher.</p>';
    document.getElementById('result-count').textContent = '0';
  });
  
  document.querySelectorAll('select, input[type="checkbox"], input[type="range"]').forEach(element => {
    element.addEventListener('change', updateFilters);
  });
  
  document.getElementById('clear-all-data').addEventListener('click', () => {
    if (confirm('Êtes-vous sûr de vouloir effacer toutes vos données (historique, favoris) ?')) {
      localStorage.removeItem('lAntreHistory');
      localStorage.removeItem('lAntreFavorites');
      document.getElementById('history').innerHTML = '';
      document.getElementById('favorites').innerHTML = '';
      document.getElementById('favorites-count').textContent = '0';
      showNotification('Données effacées.', 'success');
    }
  });
  
  initGeolocation();
  updateHistoryDisplay();
  updateFavoritesDisplay();
});