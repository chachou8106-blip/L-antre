function toggleFavorite(profile) {
  let favorites = JSON.parse(localStorage.getItem('lAntreFavorites')) || [];
  const existingIndex = favorites.findIndex(fav => fav.link === profile.link);
  
  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
    showNotification('Retiré des favoris.', 'info');
  } else {
    favorites.push(profile);
    showNotification('Ajouté aux favoris !', 'success');
  }
  
  localStorage.setItem('lAntreFavorites', JSON.stringify(favorites));
  updateFavoritesDisplay();
}

function updateFavoritesDisplay() {
  const favorites = JSON.parse(localStorage.getItem('lAntreFavorites')) || [];
  const favoritesDiv = document.getElementById('favorites');
  favoritesDiv.innerHTML = '';
  
  favorites.forEach(profile => {
    const favoriteItem = document.createElement('div');
    favoriteItem.className = 'result-card';
    favoriteItem.innerHTML = `
      <img src="${profile.image || 'assets/default-profile.png'}" alt="Profile" onerror="this.src='assets/default-profile.png';">
      <div class="result-info">
        <h3>${profile.username || 'Anonyme'}</h3>
        <p>${profile.bio || 'Aucune description'}</p>
        <p class="distance"><i class="fas fa-map-marker-alt"></i> ${profile.distance}</p>
        <a href="${profile.link}" target="_blank" class="btn btn-secondary"><i class="fas fa-external-link-alt"></i> Voir le profil</a>
      </div>
    `;
    favoriteItem.addEventListener('click', () => {
      showProfileModal(profile);
    });
    favoritesDiv.appendChild(favoriteItem);
  });
  document.getElementById('favorites-count').textContent = favorites.length;
}

window.toggleFavorite = toggleFavorite;
window.updateFavoritesDisplay = updateFavoritesDisplay;