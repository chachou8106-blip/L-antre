// Point d'entrée de L'Antre : câblage de l'interface.

/**
 * Enregistre le service worker (mode hors-ligne + installation PWA).
 * Chemin relatif : l'app est servie depuis un sous-dossier sur GitHub Pages.
 */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .catch(error => console.warn('Service worker non enregistré :', error));
  });
}

/**
 * Lance une recherche en protégeant contre les clics répétés.
 */
let searchInFlight = false;
async function runSearch() {
  if (searchInFlight) return;
  searchInFlight = true;

  const buttons = [document.getElementById('search-button'), document.getElementById('refresh-button')];
  buttons.forEach(button => { if (button) button.disabled = true; });

  try {
    await searchAll();
  } catch (error) {
    console.error('Recherche interrompue :', error);
    showNotification('La recherche a échoué. Réessaie.', 'error');
  } finally {
    searchInFlight = false;
    buttons.forEach(button => { if (button) button.disabled = false; });
    enableSearchButton();
  }
}

/**
 * Vide la zone de résultats.
 */
function clearResults() {
  const container = document.getElementById('results');
  const counter = document.getElementById('result-count');
  if (container) container.innerHTML = '<p class="no-results">Aucun résultat à afficher.</p>';
  if (counter) counter.textContent = '0';
  showNotification('Résultats effacés.', 'info');
}

/**
 * Efface historique et favoris.
 */
function clearAllData() {
  if (!confirm('Effacer tout l\'historique et tous les favoris ? Cette action est définitive.')) return;

  localStorage.removeItem('lAntreHistory');
  localStorage.removeItem('lAntreFavorites');
  updateHistoryDisplay();
  updateFavoritesDisplay();
  showNotification('Données locales effacées.', 'success');
}

/**
 * Affiche ou masque les options d'analyse d'image.
 */
function syncVisionOptions() {
  const enabled = document.getElementById('vision-enabled');
  const options = document.getElementById('vision-options');
  if (!enabled || !options) return;

  options.hidden = !enabled.checked;
  if (enabled.checked) {
    // Précharger le modèle pour que la première recherche ne bloque pas.
    ensureVisionModel().catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Tout changement de filtre met à jour l'objet `filters`.
  document.querySelectorAll('select, input[type="checkbox"], input[type="range"]')
    .forEach(element => element.addEventListener('change', updateFilters));

  // Les curseurs d'âge se mettent à jour pendant le glissement.
  ['age-min', 'age-max'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateFilters);
  });

  document.getElementById('search-button')?.addEventListener('click', runSearch);
  document.getElementById('refresh-button')?.addEventListener('click', runSearch);
  document.getElementById('clear-results')?.addEventListener('click', clearResults);
  document.getElementById('clear-all-data')?.addEventListener('click', event => {
    event.preventDefault();
    clearAllData();
  });

  document.getElementById('use-gps')?.addEventListener('click', initGeolocation);

  const cityInput = document.getElementById('city-input');
  if (cityInput) {
    cityInput.addEventListener('input', updateManualLocation);
    cityInput.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !document.getElementById('search-button')?.disabled) {
        runSearch();
      }
    });
  }

  document.getElementById('vision-enabled')?.addEventListener('change', syncVisionOptions);

  document.getElementById('select-all-sources')?.addEventListener('click', () => {
    const boxes = document.querySelectorAll('input[name="source"]');
    const allChecked = Array.from(boxes).every(box => box.checked);
    boxes.forEach(box => { box.checked = !allChecked; });
    updateFilters();
  });

  updateFilters();
  syncVisionOptions();
  enableSearchButton();
  setupModal();
  updateHistoryDisplay();
  updateFavoritesDisplay();
});

registerServiceWorker();
