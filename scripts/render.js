// Rendu des cartes et de la modale — définition unique, utilisée par les
// résultats comme par les favoris.

/**
 * Affiche l'indicateur de chargement dans la zone de résultats.
 * @param {string} message
 */
function renderLoading(message) {
  const container = document.getElementById('results');
  if (!container) return;
  container.innerHTML = `<div class="loading"><div class="spinner"></div><p>${escapeHtml(message)}</p></div>`;
}

/**
 * Indique si un lien est déjà en favori.
 * @param {string} link
 * @returns {boolean}
 */
function isFavorite(link) {
  return getFavorites().some(favorite => favorite.link === link);
}

/**
 * Construit le bloc de métadonnées d'une carte.
 * @param {Object} result
 * @returns {string} - HTML échappé.
 */
function metaHtml(result) {
  const items = [];

  if (result.location) {
    items.push(`<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(result.location)}</span>`);
  }
  items.push(`<span><i class="fas fa-globe"></i> ${escapeHtml(result.platform || 'Inconnu')}</span>`);
  if (result.gender) {
    items.push(`<span><i class="fas fa-venus-mars"></i> ${escapeHtml(result.gender)}</span>`);
  }
  if (result.role) {
    items.push(`<span><i class="fas fa-theater-masks"></i> ${escapeHtml(result.role)}</span>`);
  }
  if (result.age) {
    items.push(`<span><i class="fas fa-birthday-cake"></i> ${escapeHtml(result.age)} ans</span>`);
  }
  const date = formatDate(result.date);
  if (date) {
    items.push(`<span><i class="fas fa-clock"></i> ${escapeHtml(date)}</span>`);
  }
  (result.labels || []).slice(0, 3).forEach(label => {
    items.push(`<span class="tag-vision"><i class="fas fa-eye"></i> ${escapeHtml(label.name)}</span>`);
  });

  return `<div class="result-meta">${items.join('')}</div>`;
}

/**
 * Crée la carte DOM d'un résultat.
 * @param {Object} result
 * @param {{favorite?: boolean}} [options]
 * @returns {HTMLElement}
 */
function createResultCard(result, options = {}) {
  const card = document.createElement('div');
  card.className = result.type === 'link' ? 'result-card link-card' : 'result-card';

  const favoriteButton = document.createElement('button');
  favoriteButton.className = 'favorite-button';
  favoriteButton.type = 'button';
  favoriteButton.title = 'Ajouter aux favoris';
  favoriteButton.setAttribute('aria-label', 'Ajouter aux favoris');
  favoriteButton.innerHTML = '<i class="fas fa-heart"></i>';
  if (options.favorite || isFavorite(result.link)) favoriteButton.classList.add('favorited');
  favoriteButton.addEventListener('click', event => {
    event.stopPropagation();
    toggleFavorite(result);
    favoriteButton.classList.toggle('favorited');
  });
  card.appendChild(favoriteButton);

  if (result.type === 'link') {
    const badge = document.createElement('div');
    badge.className = 'link-badge';
    badge.innerHTML = `<i class="${escapeHtml(result.icon || 'fas fa-link')}"></i>`;
    card.appendChild(badge);
  } else {
    const image = document.createElement('img');
    image.loading = 'lazy';
    image.alt = '';
    image.src = result.image || 'assets/default-profile.png';
    image.addEventListener('error', () => { image.src = 'assets/default-profile.png'; }, { once: true });
    card.appendChild(image);
  }

  const info = document.createElement('div');
  info.className = 'result-info';
  info.innerHTML = `
    <h3>${escapeHtml(result.title || result.username || 'Anonyme')}</h3>
    ${result.type !== 'link' && result.username
      ? `<p class="result-author">${escapeHtml(result.username)}</p>` : ''}
    <p class="bio">${escapeHtml(result.bio || 'Aucune description')}</p>
    ${metaHtml(result)}
    <a href="${safeUrl(result.link)}" target="_blank" rel="noopener noreferrer nofollow"
       class="btn btn-secondary">
      <i class="fas fa-external-link-alt"></i>
      ${result.type === 'link' ? 'Ouvrir la recherche' : "Voir l'annonce"}
    </a>
  `;
  info.querySelector('a').addEventListener('click', event => event.stopPropagation());
  card.appendChild(info);

  card.addEventListener('click', () => showProfileModal(result));
  return card;
}

/**
 * Affiche la liste de résultats.
 * @param {Object[]} results
 */
function renderResults(results) {
  const container = document.getElementById('results');
  const counter = document.getElementById('result-count');
  if (!container) return;

  container.innerHTML = '';
  const posts = results.filter(result => result.type !== 'link');

  if (counter) counter.textContent = String(posts.length);

  if (!results.length) {
    container.innerHTML = '<p class="no-results">Aucun résultat. Élargis tes critères ou change de source.</p>';
    return;
  }

  if (!posts.length) {
    const notice = document.createElement('p');
    notice.className = 'no-results';
    notice.textContent = 'Aucune annonce récupérable directement : ouvre les recherches ci-dessous.';
    container.appendChild(notice);
  }

  const fragment = document.createDocumentFragment();
  results.forEach(result => fragment.appendChild(createResultCard(result)));
  container.appendChild(fragment);
}

/**
 * Affiche la modale de détail d'un résultat.
 * @param {Object} result
 */
function showProfileModal(result) {
  const modal = document.getElementById('profile-modal');
  const body = document.getElementById('modal-body');
  if (!modal || !body) return;

  const favorited = isFavorite(result.link);
  const date = formatDate(result.date);

  body.innerHTML = `
    ${result.type === 'link'
      ? `<div class="modal-badge"><i class="${escapeHtml(result.icon || 'fas fa-link')}"></i></div>`
      : `<img src="${safeUrl(result.image) === '#' ? 'assets/default-profile.png' : safeUrl(result.image)}"
              alt="" onerror="this.src='assets/default-profile.png';">`}
    <h2>${escapeHtml(result.title || result.username || 'Anonyme')}</h2>
    <p><strong>Source :</strong> ${escapeHtml(result.platform || 'Inconnue')}</p>
    ${result.username && result.type !== 'link'
      ? `<p><strong>Auteur :</strong> ${escapeHtml(result.username)}</p>` : ''}
    <p><strong>Description :</strong> ${escapeHtml(result.bio || 'Aucune description')}</p>
    ${result.location ? `<p><strong>Zone :</strong> ${escapeHtml(result.location)}</p>` : ''}
    ${result.gender ? `<p><strong>Genre :</strong> ${escapeHtml(result.gender)}</p>` : ''}
    ${result.role ? `<p><strong>Rôle :</strong> ${escapeHtml(result.role)}</p>` : ''}
    ${result.age ? `<p><strong>Âge annoncé :</strong> ${escapeHtml(result.age)} ans</p>` : ''}
    ${date ? `<p><strong>Publié :</strong> ${escapeHtml(date)}</p>` : ''}
    ${(result.labels || []).length
      ? `<p><strong>Analyse d'image :</strong> ${escapeHtml(result.labels.map(l => l.name).join(', '))}</p>`
      : ''}
    <div class="modal-actions">
      <a href="${safeUrl(result.link)}" target="_blank" rel="noopener noreferrer nofollow"
         class="btn btn-primary">
        <i class="fas fa-external-link-alt"></i> Ouvrir sur ${escapeHtml(result.platform || 'le site')}
      </a>
      <button type="button" id="modal-favorite" class="btn btn-secondary">
        <i class="fas fa-heart"></i> ${favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      </button>
    </div>
  `;

  const favoriteButton = document.getElementById('modal-favorite');
  if (favoriteButton) {
    favoriteButton.addEventListener('click', () => {
      toggleFavorite(result);
      closeModal();
    });
  }

  modal.classList.add('open');
  document.body.classList.add('modal-open');
}

/** Ferme la modale. */
function closeModal() {
  const modal = document.getElementById('profile-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.classList.remove('modal-open');
}

/** Branche la fermeture de la modale (croix, clic extérieur, Échap). */
function setupModal() {
  const modal = document.getElementById('profile-modal');
  if (!modal) return;

  const closeButton = modal.querySelector('.close-modal');
  if (closeButton) closeButton.addEventListener('click', closeModal);

  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal();
  });
}

window.renderLoading = renderLoading;
window.renderResults = renderResults;
window.createResultCard = createResultCard;
window.showProfileModal = showProfileModal;
window.closeModal = closeModal;
window.setupModal = setupModal;
window.isFavorite = isFavorite;
