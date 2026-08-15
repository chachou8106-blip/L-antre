// Gestion du scraping pour L'Antre (Version Autonome - Front-End Only)

// URL du proxy CORS public (pour contourner les restrictions)
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
const ALTERNATIVE_CORS_PROXY = 'https://thingproxy.freeboard.io/fetch/';

// Fonction pour choisir un proxy CORS fonctionnel
async function getWorkingProxy() {
  try {
    // Tester le proxy principal
    await fetch(CORS_PROXY + 'https://www.reddit.com/r/DirtyR4R.json', {
      method: 'HEAD',
      mode: 'no-cors'
    });
    return CORS_PROXY;
  } catch (error) {
    // Si le proxy principal échoue, utiliser l'alternative
    try {
      await fetch(ALTERNATIVE_CORS_PROXY + 'https://www.reddit.com/r/DirtyR4R.json', {
        method: 'HEAD'
      });
      return ALTERNATIVE_CORS_PROXY;
    } catch (error) {
      showNotification('Aucun proxy CORS disponible. Utilisation de données simulées.', 'warning');
      return null; // Pas de proxy disponible
    }
  }
}

// =============================================
// 1. Scraping de Reddit (r/DirtyR4R, r/BDSM, etc.)
// =============================================
async function scrapeReddit() {
  const query = buildRedditQuery();
  const location = filters.location;
  const proxy = await getWorkingProxy();

  try {
    showNotification('Recherche sur Reddit en cours...', 'info');

    let url = `https://www.reddit.com/r/DirtyR4R+bdsm+Femdom+libertin/search.json?q=${query}&sort=new&limit=20`;

    // Si un proxy est disponible, l'utiliser
    if (proxy) {
      url = proxy + url;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || !data.data.children) {
      showNotification('Aucune donnée reçue de Reddit.', 'error');
      return [];
    }

    const results = data.data.children.map(post => {
      const bio = post.data.title + ' ' + (post.data.selftext || '');
      return {
        platform: 'Reddit',
        subreddit: `r/${post.data.subreddit}`,
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
        verified: false
      };
    }).filter(profile => matchesFilters(profile));

    showNotification(`Trouvé ${results.length} résultat(s) sur Reddit.`, 'success');
    return results;

  } catch (error) {
    console.error('Erreur Reddit:', error);
    showNotification('Erreur lors de la recherche sur Reddit. Utilisation de données simulées.', 'warning');
    // Retourner des données simulées si Reddit échoue
    return getSimulatedRedditResults();
  }
}

// Données simulées pour Reddit (fallback)
function getSimulatedRedditResults() {
  const simulatedResults = [
    {
      platform: 'Reddit',
      subreddit: 'r/DirtyR4R',
      username: 'Dominatrice_Paris',
      bio: 'Dominatrice amateur à Paris, je cherche des soumis pour des jeux de Femdom et sodomie. Disponible ce week-end.',
      link: 'https://www.reddit.com/r/DirtyR4R/comments/xyz123',
      image: null,
      date: new Date().toISOString(),
      distance: filters.location.city || '~50 km',
      gender: 'Femme',
      role: 'Dominatrice',
      verified: false
    },
    {
      platform: 'Reddit',
      subreddit: 'r/BDSM',
      username: 'Soumis_Lyon',
      bio: 'Soumis à Lyon, je cherche une dominatrice pour des séances de bondage et humiliation. Débutant mais motivé.',
      link: 'https://www.reddit.com/r/BDSM/comments/abc456',
      image: null,
      date: new Date().toISOString(),
      distance: filters.location.city || '~50 km',
      gender: 'Homme',
      role: 'Soumis',
      verified: false
    },
    {
      platform: 'Reddit',
      subreddit: 'r/Femdom',
      username: 'Maîtresse_Marseille',
      bio: 'Maîtresse expérimentée à Marseille. Je propose des séances de Femdom, sodomie et humiliation. Tarif : 0€ (amateur).',
      link: 'https://www.reddit.com/r/Femdom/comments/def789',
      image: null,
      date: new Date().toISOString(),
      distance: filters.location.city || '~50 km',
      gender: 'Femme',
      role: 'Dominatrice',
      verified: false
    }
  ].filter(profile => matchesFilters(profile));

  showNotification(`Affichage de ${simulatedResults.length} résultats simulés pour Reddit.`, 'info');
  return simulatedResults;
}

// =============================================
// 2. Scraping de FetLife (pages publiques)
// =============================================
async function scrapeFetLife() {
  const { radius, location } = filters;
  const city = location.city || 'Paris';

  try {
    showNotification('Recherche sur FetLife en cours...', 'info');

    // FetLife bloque les requêtes directes, donc on utilise des données simulées
    const simulatedResults = [
      {
        platform: 'FetLife',
        username: `Dominatrice_${city}`,
        bio: `Dominatrice amateur à ${city}, j'adore les soumis et la sodomie. Rejoignez-moi pour des rencontres discrètes.`,
        link: `https://fetlife.com/users/Dominatrice_${city.toLowerCase().replace(' ', '_')}`,
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
        bio: `Soumis à ${city}, je cherche une dominatrice pour des jeux de Femdom et bondage. Disponible en semaine.`,
        link: `https://fetlife.com/users/Soumis_${city.toLowerCase().replace(' ', '_')}`,
        image: null,
        date: new Date().toISOString(),
        distance: location.lat ? '~' + radius + ' km' : city,
        gender: 'Homme',
        role: 'Soumis',
        verified: false
      },
      {
        platform: 'FetLife',
        username: `Couple_${city}`,
        bio: `Couple libertin à ${city}, on cherche des partenaires pour des soirées à thème. Ouverts à toutes les pratiques.`,
        link: `https://fetlife.com/users/Couple_${city.toLowerCase().replace(' ', '_')}`,
        image: null,
        date: new Date().toISOString(),
        distance: location.lat ? '~' + radius + ' km' : city,
        gender: 'Couple',
        role: 'Amateur',
        verified: false
      }
    ].filter(profile => matchesFilters(profile));

    showNotification(`Trouvé ${simulatedResults.length} résultat(s) simulés pour FetLife.`, 'success');
    return simulatedResults;

  } catch (error) {
    console.error('Erreur FetLife:', error);
    showNotification('Erreur lors de la recherche sur FetLife. Utilisation de données simulées.', 'warning');
    return getSimulatedFetLifeResults();
  }
}

// Données simulées pour FetLife (fallback)
function getSimulatedFetLifeResults() {
  return getSimulatedRedditResults().map(profile => ({
    ...profile,
    platform: 'FetLife',
    link: profile.link.replace('reddit.com', 'fetlife.com')
  }));
}

// =============================================
// 3. Scraping de Google Maps (lieux libertins)
// =============================================
async function scrapeGoogleMaps() {
  const query = buildGoogleMapsQuery();
  const { location, radius } = filters;

  if (!location.lat || !location.lng) {
    showNotification('Géolocalisation requise pour Google Maps.', 'error');
    return [];
  }

  try {
    showNotification('Recherche sur Google Maps en cours...', 'info');

    // Google Maps nécessite une clé API, donc on simule des résultats
    const simulatedResults = [
      {
        platform: 'Google Maps',
        username: 'Club Libertin Paris',
        bio: 'Club libertin au cœur de Paris. Soirées à thème tous les vendredis. Entrée : 20€ (consommation incluse).',
        link: 'https://www.google.com/maps/place/Club+Libertin+Paris',
        image: null,
        date: null,
        distance: '~' + radius + ' km',
        gender: null,
        role: null,
        verified: true
      },
      {
        platform: 'Google Maps',
        username: 'Sauna Mixte Lyon',
        bio: 'Sauna mixte à Lyon avec espaces dédiés aux rencontres libertines. Ouvert 24h/24.',
        link: 'https://www.google.com/maps/place/Sauna+Mixte+Lyon',
        image: null,
        date: null,
        distance: '~' + radius + ' km',
        gender: null,
        role: null,
        verified: true
      }
    ].filter(profile => matchesFilters(profile));

    showNotification(`Trouvé ${simulatedResults.length} lieu(x) simulés sur Google Maps.`, 'success');
    return simulatedResults;

  } catch (error) {
    console.error('Erreur Google Maps:', error);
    showNotification('Erreur lors de la recherche sur Google Maps. Utilisation de données simulées.', 'warning');
    return getSimulatedGoogleMapsResults();
  }
}

// Données simulées pour Google Maps (fallback)
function getSimulatedGoogleMapsResults() {
  return [
    {
      platform: 'Google Maps',
      username: 'Club Libertin Nearby',
      bio: 'Club libertin près de chez vous. Vérifiez les horaires et les événements.',
      link: 'https://www.google.com/maps',
      image: null,
      date: null,
      distance: '~' + filters.radius + ' km',
      gender: null,
      role: null,
      verified: true
    }
  ];
}

// =============================================
// 4. Scraping de Craigslist (section Activités)
// =============================================
async function scrapeCraigslist() {
  const { location } = filters;
  const city = location.city || 'paris';

  try {
    showNotification('Recherche sur Craigslist en cours...', 'info');

    // Craigslist bloque les requêtes automatiques, donc on simule des résultats
    const simulatedResults = [
      {
        platform: 'Craigslist',
        username: 'Anonyme',
        bio: `Rencontre discrète à ${city}. Je cherche un partenaire pour des jeux BDSM. Sérieux uniquement.`,
        link: `https://${city}.craigslist.org/act/d/rencontre-bdsm/123456789.html`,
        image: null,
        date: new Date().toISOString(),
        distance: location.lat ? '~' + filters.radius + ' km' : city,
        gender: null,
        role: null,
        verified: false
      },
      {
        platform: 'Craigslist',
        username: 'Anonyme',
        bio: `Couple libertin à ${city} cherche une femme pour une soirée. Pas de pros.`,
        link: `https://${city}.craigslist.org/act/d/couple-libertin/987654321.html`,
        image: null,
        date: new Date().toISOString(),
        distance: location.lat ? '~' + filters.radius + ' km' : city,
        gender: 'Couple',
        role: 'Amateur',
        verified: false
      }
    ].filter(profile => matchesFilters(profile));

    showNotification(`Trouvé ${simulatedResults.length} résultat(s) simulés sur Craigslist.`, 'success');
    return simulatedResults;

  } catch (error) {
    console.error('Erreur Craigslist:', error);
    showNotification('Erreur lors de la recherche sur Craigslist. Utilisation de données simulées.', 'warning');
    return getSimulatedCraigslistResults();
  }
}

// Données simulées pour Craigslist (fallback)
function getSimulatedCraigslistResults() {
  return [
    {
      platform: 'Craigslist',
      username: 'Anonyme',
      bio: 'Rencontre pour jeux BDSM. Discrétion garantie.',
      link: 'https://www.craigslist.org/act',
      image: null,
      date: new Date().toISOString(),
      distance: '~' + filters.radius + ' km',
      gender: null,
      role: null,
      verified: false
    }
  ];
}

// =============================================
// 5. Scraping d'OkCupid (recherche sans compte)
// =============================================
async function scrapeOkCupid() {
  const { location, ageMin, ageMax } = filters;
  const city = location.city || 'Paris';
  const gender = filters.gender[0] || 'women';

  try {
    showNotification('Recherche sur OkCupid en cours...', 'info');

    // OkCupid bloque les requêtes automatiques, donc on simule des résultats
    const simulatedResults = [
      {
        platform: 'OkCupid',
        username: 'Dominatrice25',
        bio: 'Dominatrice de 25 ans à Paris. Je cherche des soumis pour des séances de Femdom. Pas de pros.',
        link: 'https://www.okcupid.com/profile/Dominatrice25',
        image: 'https://via.placeholder.com/150?text=Dominatrice',
        date: new Date().toISOString(),
        distance: location.lat ? '~' + filters.radius + ' km' : city,
        gender: 'Femme',
        role: 'Dominatrice',
        verified: false
      },
      {
        platform: 'OkCupid',
        username: 'Soumis30',
        bio: 'Soumis de 30 ans à Lyon. Je cherche une dominatrice pour des jeux de soumission. Débutant mais motivé.',
        link: 'https://www.okcupid.com/profile/Soumis30',
        image: 'https://via.placeholder.com/150?text=Soumis',
        date: new Date().toISOString(),
        distance: location.lat ? '~' + filters.radius + ' km' : city,
        gender: 'Homme',
        role: 'Soumis',
        verified: false
      }
    ].filter(profile => matchesFilters(profile));

    showNotification(`Trouvé ${simulatedResults.length} résultat(s) simulés sur OkCupid.`, 'success');
    return simulatedResults;

  } catch (error) {
    console.error('Erreur OkCupid:', error);
    showNotification('Erreur lors de la recherche sur OkCupid. Utilisation de données simulées.', 'warning');
    return getSimulatedOkCupidResults();
  }
}

// Données simulées pour OkCupid (fallback)
function getSimulatedOkCupidResults() {
  return [
    {
      platform: 'OkCupid',
      username: 'Utilisateur_Anonyme',
      bio: 'Recherche de partenaires pour des rencontres discrètes.',
      link: 'https://www.okcupid.com',
      image: 'https://via.placeholder.com/150?text=Anonyme',
      date: new Date().toISOString(),
      distance: '~' + filters.radius + ' km',
      gender: null,
      role: null,
      verified: false
    }
  ];
}

// =============================================
// 6. Scraping des Forums Libertins
// =============================================
async function scrapeForums() {
  const query = encodeURIComponent(buildGoogleMapsQuery());

  try {
    showNotification('Recherche sur les forums en cours...', 'info');

    // Les forums bloquent souvent les requêtes automatiques, donc on simule des résultats
    const simulatedResults = [
      {
        platform: 'Forum Libertin',
        username: 'Membre_Actif',
        bio: `Discussion : Rencontres libertines à ${filters.location.city || 'Paris'}. Rejoignez-nous pour échanger et organiser des soirées.`,
        link: 'https://www.forum-libertin.fr/viewtopic.php?id=12345',
        image: null,
        date: new Date().toISOString(),
        distance: filters.location.city || 'Inconnu',
        gender: null,
        role: null,
        verified: false
      },
      {
        platform: 'Forum Libertin',
        username: 'Nouveau_Membre',
        bio: `Recherche : Couple débutant cherche des conseils et des partenaires pour des jeux BDSM.`,
        link: 'https://www.forum-libertin.fr/viewtopic.php?id=67890',
        image: null,
        date: new Date().toISOString(),
        distance: filters.location.city || 'Inconnu',
        gender: 'Couple',
        role: 'Amateur',
        verified: false
      }
    ].filter(profile => matchesFilters(profile));

    showNotification(`Trouvé ${simulatedResults.length} résultat(s) simulés sur les forums.`, 'success');
    return simulatedResults;

  } catch (error) {
    console.error('Erreur forums:', error);
    showNotification('Erreur lors de la recherche sur les forums. Utilisation de données simulées.', 'warning');
    return getSimulatedForumsResults();
  }
}

// Données simulées pour les forums (fallback)
function getSimulatedForumsResults() {
  return [
    {
      platform: 'Forum Libertin',
      username: 'Membre_Anonyme',
      bio: 'Discussion générale sur les rencontres libertines.',
      link: 'https://www.forum-libertin.fr',
      image: null,
      date: new Date().toISOString(),
      distance: 'Inconnu',
      gender: null,
      role: null,
      verified: false
    }
  ];
}

// =============================================
// Fonction principale pour lancer toutes les recherches
// =============================================
async function searchAll() {
  updateFilters();
  const results = [];
  const resultsDiv = document.getElementById('results');

  if (resultsDiv) {
    resultsDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Recherche en cours...</p></div>';
  }

  try {
    // Lancer toutes les recherches en parallèle
    const scrapingPromises = [
      scrapeReddit(),
      scrapeFetLife(),
      scrapeGoogleMaps(),
      scrapeCraigslist(),
      scrapeOkCupid(),
      scrapeForums()
    ];

    const scrapingResults = await Promise.allSettled(scrapingPromises);

    // Traiter les résultats
    scrapingResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      }
    });

    // Mélanger les résultats pour éviter les doublons
    results.sort(() => Math.random() - 0.5);

    // Afficher les résultats
    if (results.length > 0) {
      displayResults(results);
      saveToHistory(filters, results.length);
    } else {
      if (resultsDiv) {
        resultsDiv.innerHTML = '<p class="no-results">Aucun résultat trouvé. Essayez d\'élargir vos critères.</p>';
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

// =============================================
// Affichage des résultats
// =============================================
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

// =============================================
// Affiche une modale avec les détails d'un profil
// =============================================
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

// =============================================
// Exporter les fonctions pour les autres scripts
// =============================================
window.scrapeReddit = scrapeReddit;
window.scrapeFetLife = scrapeFetLife;
window.scrapeGoogleMaps = scrapeGoogleMaps;
window.scrapeCraigslist = scrapeCraigslist;
window.scrapeOkCupid = scrapeOkCupid;
window.scrapeForums = scrapeForums;
window.searchAll = searchAll;
window.displayResults = displayResults;
window.showProfileModal = showProfileModal;
