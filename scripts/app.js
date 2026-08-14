// Logique principale de l'application L'Antre

document.addEventListener('DOMContentLoaded', () => {
  // Initialiser les écouteurs d'événements pour les filtres
  const filterElements = document.querySelectorAll('select, input[type="checkbox"], input[type="range"]');
  filterElements.forEach(element => {
    element.addEventListener('change', updateFilters);
  });
  
  // Initialiser les écouteurs pour les boutons
  const searchButton = document.getElementById('search-button');
  const refreshButton = document.getElementById('refresh-button');
  const clearResultsButton = document.getElementById('clear-results');
  const clearAllDataButton = document.getElementById('clear-all-data');
  
  if (searchButton) {
    searchButton.addEventListener('click', searchAll);
  }
  
  if (refreshButton) {
    refreshButton.addEventListener('click', searchAll);
  }
  
  if (clearResultsButton) {
    clearResultsButton.addEventListener('click', () => {
      const resultsDiv = document.getElementById('results');
      if (resultsDiv) {
        resultsDiv.innerHTML = '<p class="no-results">Aucun résultat à afficher.</p>';
      }
      const resultCount = document.getElementById('result-count');
      if (resultCount) {
        resultCount.textContent = '0';
      }
      showNotification('Résultats effacés.', 'info');
    });
  }
  
  if (clearAllDataButton) {
    clearAllDataButton.addEventListener('click', () => {
      if (confirm('Êtes-vous sûr de vouloir effacer toutes vos données (historique, favoris) ?')) {
        localStorage.removeItem('lAntreHistory');
        localStorage.removeItem('lAntreFavorites');
        
        // Réinitialiser l'affichage
        const historyDiv = document.getElementById('history');
        const favoritesDiv = document.getElementById('favorites');
        const favoritesCount = document.getElementById('favorites-count');
        
        if (historyDiv) historyDiv.innerHTML = '<p class="no-results">Aucune recherche dans l\'historique.</p>';
        if (favoritesDiv) favoritesDiv.innerHTML = '<p class="no-results">Aucun favori pour le moment.</p>';
        if (favoritesCount) favoritesCount.textContent = '0';
        
        showNotification('Toutes les données ont été effacées.', 'success');
      }
    });
  }
  
  // Initialiser la géolocalisation
  initGeolocation();
  
  // Charger l'historique et les favoris au démarrage
  updateHistoryDisplay();
  updateFavoritesDisplay();
  
  // Initialiser la modale
  setupModalClose();
});

// Fonction pour initialiser la fermeture de la modale
function setupModalClose() {
  const modal = document.getElementById('profile-modal');
  if (!modal) return;
  
  const closeModal = modal.querySelector('.close-modal');
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
  
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}
