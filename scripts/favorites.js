// Gestion des favoris (localStorage)

const FAVORITES_KEY = 'lAntreFavorites';

/**
 * Lit les favoris enregistrés.
 * @returns {Object[]}
 */
function getFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.warn('Favoris illisibles, réinitialisation :', error);
    return [];
  }
}

/**
 * Enregistre la liste des favoris.
 * @param {Object[]} favorites
 */
function saveFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    showNotification('Stockage plein : impossible d\'enregistrer ce favori.', 'error');
  }
}

/**
 * Ajoute ou retire un résultat des favoris.
 * @param {Object} result
 * @returns {boolean} - True si le résultat est désormais en favori.
 */
function toggleFavorite(result) {
  const favorites = getFavorites();
  const index = favorites.findIndex(favorite => favorite.link === result.link);

  if (index >= 0) {
    favorites.splice(index, 1);
    saveFavorites(favorites);
    updateFavoritesDisplay();
    showNotification('Retiré des favoris.', 'info');
    return false;
  }

  // On ne stocke que les champs utiles à l'affichage.
  favorites.unshift({
    type: result.type,
    id: result.id,
    source: result.source,
    platform: result.platform,
    icon: result.icon,
    title: result.title,
    username: result.username,
    bio: result.bio,
    link: result.link,
    image: result.image,
    date: result.date,
    location: result.location,
    gender: result.gender,
    role: result.role,
    age: result.age,
    savedAt: new Date().toISOString()
  });

  saveFavorites(favorites);
  updateFavoritesDisplay();
  showNotification('Ajouté aux favoris.', 'success');
  return true;
}

/**
 * Redessine la grille des favoris.
 */
function updateFavoritesDisplay() {
  const container = document.getElementById('favorites');
  const counter = document.getElementById('favorites-count');
  const favorites = getFavorites();

  if (counter) counter.textContent = String(favorites.length);
  if (!container) return;

  container.innerHTML = '';

  if (!favorites.length) {
    container.innerHTML = '<p class="no-results">Aucun favori pour le moment.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  favorites.forEach(favorite => fragment.appendChild(createResultCard(favorite, { favorite: true })));
  container.appendChild(fragment);
}

window.getFavorites = getFavorites;
window.toggleFavorite = toggleFavorite;
window.updateFavoritesDisplay = updateFavoritesDisplay;
