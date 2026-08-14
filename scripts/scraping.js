// Gestion du scraping pour L'Antre

/**
 * Scrape les résultats depuis Reddit
 * @returns {Promise<Array>} - Promesse résolue avec un tableau de profils
 */
async function scrapeReddit() {
  const query = buildRedditQuery();
  const location = filters.location;
  
  let url = `https://www.reddit.com/r/DirtyR4R/search.json?q=${query}&sort=new`;
  
  // Ajouter la localisation à l'URL si une ville est spécifiée
  if (location.city) {
    url += `&geo_filter=${encodeURIComponent(location.city)}`;
  }
  
  try {
    showNotification('Recherche sur Reddit en cours...', 'info');
    
    // Utiliser un proxy CORS pour contourner les restrictions
    const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.data || !data.data.children) {
      showNotification('Aucune donnée reçue de Reddit.', 'error');
      return [];
    }
    
    // Transformer les résultats
    const results = data.data.children.map(post => {
      const bio = post.data.title + ' ' + (post.data.selftext || '');
      
      return {
        platform: 'Reddit',
        username: post.data.author || 'Anonyme',
        bio: bio.trim(),
        link: `https://www.reddit.com${post.data.permalink}`,
        image: post.data.thumbnail && post.data.thumbnail !== 'self' && post.data.thumbnail !== 'default' 
               ? post.data.thumbnail 
               : null,
        date: post.data.created_utc ? new Date(post.data.created_utc * 1000).toISOString() : null,
        distance: location.lat ? '~' + filters.radius + ' km' : location.city || 'Inconnu',
        gender: null,
        role: null,
        verified: post.data.author_flair_text === 'Verified' || false
      };
    }).filter(profile => matchesFilters(profile));
    
    showNotification(`Trouvé ${results.length} résultat(s) sur Reddit.`, 'success');
    return results;
    
  } catch (error) {
    console.error('Erreur lors du scraping Reddit:', error);
    showNotification('Erreur lors de la recherche sur Reddit. Vérifiez votre connexion ou essayez plus tard.', 'error');
    return [];
  }
}

/**
 * Scrape les résultats depuis FetLife (pages publiques)
 * @returns {Promise<Array>} - Promesse résolue avec un tableau de profils
 */
async function scrapeFetLife() {
  const { radius, location } = filters;
  const cities = location.city ? [location.city] : ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux'];
  const results = [];
  
  showNotification('Recherche sur FetLife en cours...', 'info');
  
  for (const city of cities) {
    try {
      // Note: FetLife n'a pas d'API publique, donc on simule une recherche
      // Dans une vraie implémentation, il faudrait utiliser un proxy ou un service backend
      // Ici, on va simuler des résultats pour démonstration
      
      // Simuler des résultats pour FetLife (à remplacer par du vrai scraping)
      const simulatedResults = [
        {
          platform: 'FetLife',
          username: `Dominatrice_${city}`,
          bio: `Dominatrice amateur à ${city}, j'adore les soumis et la sodomie.`,
          link: `https://fetlife.com/users/${Math.random().toString(36).substring(2, 10)}`,
          image: null,
          date: new Date().toISOString(),
          distance: location.lat ? '~' + radius + ' km' : city,
          gender: 'Femme',
          role: 'Dominatrice',
          verified: false
        },
        {
          platform: 'FetLife',
          username: `Soumis_${city}`,
          bio: `Soumis à la recherche d'une dominatrice pour des jeux de Femdom.`,
          link: `https://fetlife.com/users/${Math.random().toString(36).substring(2, 10)}`,
          image: null,
          date: new Date().toISOString(),
          distance: location.lat ? '~' + radius + ' km' : city,
          gender: 'Homme',
          role: 'Soumis',
          verified: false
        }
      ];
      
      results.push(...simulatedResults.filter(profile => matchesFilters(profile)));
      
    } catch (error) {
      console.error(`Erreur lors du scraping FetLife pour ${city}:`, error);
    }
  }
  
  if (results.length > 0) {
    showNotification(`Trouvé ${results.length} résultat(s) sur FetLife.`, 'success');
  }
  
  return results;
}

/**
 * Scrape les résultats depuis Google Maps (lieux)
 * @returns {Promise<Array>} - Promesse résolue avec un tableau de lieux
 */
async function scrapeGoogleMaps() {
  const query = buildGoogleMapsQuery();
  const { location, radius } = filters;
  
  try {
    showNotification('Recherche sur Google Maps en cours...', 'info');
    
    // Note: L'API Google Maps nécessite une clé API
    // Ici, on simule des résultats pour démonstration
    const simulatedResults = [
      {
        platform: 'Google Maps',
        username: 'Club Libertin Paris',
        bio: 'Club libertin au cœur de Paris, soirées à thème.',
        link: 'https://www.google.com/maps/place/Club+Libertin+Paris',
        image: null,
        date: null,
        distance: location.lat ? '~' + radius + ' km' : location.city || 'Paris',
        gender: null,
        role: null,
        verified: true
      }
    ];
    
    showNotification(`Trouvé ${simulatedResults.length} lieu(x) sur Google Maps.`, 'success');
    return simulatedResults.filter(profile => matchesFilters(profile));
    
  } catch (error) {
    console.error('Erreur lors du scraping Google Maps:', error);
    showNotification('Erreur lors de la recherche sur Google Maps.', 'error');
    return [];
  }
}

/**
 * Effectue une recherche sur tous les sites
 */
async function searchAll() {
  updateFilters();
  
  const resultsDiv = document.getElementById('results');
  if (resultsDiv) {
    resultsDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Recherche en cours...</p></div>';
  }
  
  try {
    // Lancer toutes les recherches en parallèle
    const scrapingPromises = [
      scrapeReddit(),
      scrapeFetLife(),
      scrapeGoogleMaps()
    ];
    
    const scrapingResults = await Promise.allSettled(scrapingPromises);
    
    // Traiter les résultats
    const allResults = [];
    scrapingResults.forEach(result => {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      } else {
        console.error('Erreur lors du scraping:', result.reason);
      }
    });
    
    // Afficher les résultats
    if (allResults.length > 0) {
      displayResults(allResults);
      saveToHistory(filters, allResults.length);
    } else {
      if (resultsDiv) {
        resultsDiv.innerHTML = '<p class="no-results">Aucun résultat trouvé. Essayez d\'élargir vos critères ou changez de localisation.</p>';
      }
      showNotification('Aucun résultat trouvé.', 'error');
    }
    
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    showNotification('Une erreur est survenue lors de la recherche.', 'error');
    if (resultsDiv) {
      resultsDiv.innerHTML = '<p class="no-results">Erreur lors de la recherche. Veuillez réessayer.</p>';
    }
  }
}

/**
 * Affiche les résultats dans l'interface
 * @param {Array} results - Tableau de profils à afficher
 */
function displayResults(results) {
  const resultsDiv = document.getElementById('results');
  const resultCount = document.getElementById('result-count');
  
  if (!resultsDiv) return;
  
  resultsDiv.innerHTML = '';
  
  if (results.length === 0) {
    resultsDiv.innerHTML = '<p class="no-results">Aucun résultat trouvé.</p>';
    if (resultCount) resultCount.textContent = '0';
    return;
  }
  
  // Trier les résultats (par date ou distance selon le filtre)
  if (filters.sortBy === 'distance') {
    results.sort((a, b) => {
      const aDist = parseInt(a.distance) || 0;
      const bDist = parseInt(b.distance) || 0;
      return aDist - bDist;
    });
  }
  
  // Afficher chaque résultat
  results.forEach(result => {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    
    // Bouton de favoris
    const favoriteButton = document.createElement('button');
    favoriteButton.className = 'favorite-button';
    favoriteButton.innerHTML = '<i class="fas fa-heart"></i>';
    favoriteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(result);
      favoriteButton.classList.toggle('favorited');
    });
    
    // Vérifier si le profil est déjà dans les favoris
    const favorites = JSON.parse(localStorage.getItem('lAntreFavorites')) || [];
    if (favorites.some(fav => fav.link === result.link)) {
      favoriteButton.classList.add('favorited');
    }
    
    // Image du profil
    const profileImg = document.createElement('img');
    profileImg.src = result.image || 'assets/default-profile.png';
    profileImg.alt = 'Profile';
    profileImg.onerror = () => { 
      profileImg.src = 'assets/default-profile.png'; 
    };
    
    // Informations du profil
    const resultInfo = document.createElement('div');
    resultInfo.className = 'result-info';
    resultInfo.innerHTML = `
      <h3>${result.username || 'Anonyme'}</h3>
      <p class="bio">${result.bio || 'Aucune description'}</p>
      <div class="result-meta">
        <span><i class="fas fa-map-marker-alt"></i> ${result.distance}</span>
        <span><i class="fas fa-globe"></i> ${result.platform || 'Inconnu'}</span>
        ${result.gender ? `<span><i class="fas fa-venus-mars"></i> ${result.gender}</span>` : ''}
        ${result.role ? `<span><i class="fas fa-theater-masks"></i> ${result.role}</span>` : ''}
      </div>
      <a href="${result.link}" target="_blank" class="btn btn-secondary">
        <i class="fas fa-external-link-alt"></i> Voir le profil
      </a>
    `;
    
    // Assembler la carte
    resultCard.appendChild(favoriteButton);
    resultCard.appendChild(profileImg);
    resultCard.appendChild(resultInfo);
    
    // Ajouter un événement pour afficher le profil en détail
    resultCard.addEventListener('click', () => {
      showProfileModal(result);
    });
    
    resultsDiv.appendChild(resultCard);
  });
  
  // Mettre à jour le compteur de résultats
  if (resultCount) {
    resultCount.textContent = results.length;
  }
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
    ${profile.gender ? `<p><strong>Genre:</strong> ${profile.gender}</p>` : ''}
    ${profile.role ? `<p><strong>Rôle:</strong> ${profile.role}</p>` : ''}
    ${profile.date ? `<p><strong>Date:</strong> ${new Date(profile.date).toLocaleString('fr-FR')}</p>` : ''}
    <div class="modal-actions">
      <a href="${profile.link}" target="_blank" class="btn btn-primary">
        <i class="fas fa-external-link-alt"></i> Voir le profil complet
      </a>
    </div>
  `;
  
  modal.style.display = 'block';
}

// Exporter les fonctions pour les autres scripts
window.scrapeReddit = scrapeReddit;
window.scrapeFetLife = scrapeFetLife;
window.scrapeGoogleMaps = scrapeGoogleMaps;
window.searchAll = searchAll;
window.displayResults = displayResults;
window.showProfileModal = showProfileModal;
