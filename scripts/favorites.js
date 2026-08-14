// Gestion des favoris dans l'application

/**
 * Ajoute ou retire un profil des favoris
 * @param {Object} profile - Le profil à ajouter ou retirer
 */
function toggleFavorite(profile) {
  // Récupérer les favoris existants ou créer un tableau vide
  let favorites = JSON.parse(localStorage.getItem('lAntreFavorites')) || [];
  
  // Vérifier si le profil est déjà dans les favoris
  const existingIndex = favorites.findIndex(fav => fav.link === profile.link);
  
  if (existingIndex >= 0) {
    // Retirer des favoris
    favorites.splice(existingIndex, 1);
    showNotification('Retiré des favoris', 'info');
  } else {
    // Ajouter aux favoris
    favorites.push(profile);
    showNotification('Ajouté aux favoris !', 'success');
  }
  
  // Sauvegarder dans le localStorage
  localStorage.setItem('lAntreFavorites', JSON.stringify(favorites));
  
  // Mettre à jour l'affichage
  updateFavoritesDisplay();
}

/**
 * Met à jour l'affichage des favoris
 */
function updateFavoritesDisplay() {
  const favorites = JSON.parse(localStorage.getItem('lAntreFavorites')) || [];
  const favoritesDiv = document.getElementById('favorites');
  
  if (!favoritesDiv) return;
  
  favoritesDiv.innerHTML = '';
  
  if (favorites.length === 0) {
    favoritesDiv.innerHTML = '<p class="no-results">Aucun favori pour le moment.</p>';
    document.getElementById('favorites-count').textContent = '0';
    return;
  }
  
  document.getElementById('favorites-count').textContent = favorites.length;
  
  // Créer une carte pour chaque favori
  favorites.forEach(profile => {
    const favoriteCard = document.createElement('div');
    favoriteCard.className = 'result-card';
    
    const favoriteButton = document.createElement('button');
    favoriteButton.className = 'favorite-button favorited';
    favoriteButton.innerHTML = '<i class="fas fa-heart"></i>';
    favoriteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(profile);
    });
    
    const profileImg = document.createElement('img');
    profileImg.src = profile.image || 'assets/default-profile.png';
    profileImg.alt = 'Profile';
    profileImg.onerror = () => { profileImg.src = 'assets/default-profile.png'; };
    
    const resultInfo = document.createElement('div');
    resultInfo.className = 'result-info';
    resultInfo.innerHTML = `
      <h3>${profile.username || 'Anonyme'}</h3>
      <p>${profile.bio || 'Aucune description'}</p>
      <p class="distance"><i class="fas fa-map-marker-alt"></i> ${profile.distance}</p>
      <p class="platform"><i class="fas fa-globe"></i> ${profile.platform || 'Inconnu'}</p>
      <a href="${profile.link}" target="_blank" class="btn btn-secondary"><i class="fas fa-external-link-alt"></i> Voir le profil</a>
    `;
    
    favoriteCard.appendChild(favoriteButton);
    favoriteCard.appendChild(profileImg);
    favoriteCard.appendChild(resultInfo);
    
    // Ajouter un événement pour afficher le profil en détail
    favoriteCard.addEventListener('click', () => {
      showProfileModal(profile);
    });
    
    favoritesDiv.appendChild(favoriteCard);
  });
}

/**
 * Affiche une modale avec les détails d'un profil
 * @param {Object} profile - Le profil à afficher
 */
function showProfileModal(profile) {
  const modal = document.getElementById('profile-modal');
  const modalBody = document.getElementById('modal-body');
  
  if (!modal || !modalBody) return;
  
  modalBody.innerHTML = `
    <img src="${profile.image || 'assets/default-profile.png'}" alt="Profile" 
         onerror="this.src='assets/default-profile.png';">
    <h2>${profile.username || 'Anonyme'}</h2>
    <p><strong>Plateforme:</strong> ${profile.platform || 'Inconnu'}</p>
    <p><strong>Bio:</strong> ${profile.bio || 'Aucune description'}</p>
    <p><strong>Distance:</strong> ${profile.distance}</p>
    ${profile.date ? `<p><strong>Date:</strong> ${new Date(profile.date).toLocaleString('fr-FR')}</p>` : ''}
    <div class="modal-actions">
      <a href="${profile.link}" target="_blank" class="btn btn-primary">
        <i class="fas fa-external-link-alt"></i> Voir le profil complet
      </a>
      <button id="remove-from-favorites" class="btn btn-secondary">
        <i class="fas fa-trash"></i> Retirer des favoris
      </button>
    </div>
  `;
  
  // Ajouter un événement pour retirer des favoris depuis la modale
  const removeButton = document.getElementById('remove-from-favorites');
  if (removeButton) {
    removeButton.addEventListener('click', () => {
      toggleFavorite(profile);
      modal.style.display = 'none';
    });
  }
  
  modal.style.display = 'block';
}

// Fermer la modale en cliquant sur la croix ou en dehors
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

// Initialiser la fermeture de la modale au chargement de la page
document.addEventListener('DOMContentLoaded', setupModalClose);

// Exporter les fonctions pour les autres scripts
window.toggleFavorite = toggleFavorite;
window.updateFavoritesDisplay = updateFavoritesDisplay;
window.showProfileModal = showProfileModal;
