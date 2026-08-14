async function scrapeReddit() {
  const query = buildRedditQuery();
  const url = `https://www.reddit.com/r/DirtyR4R/search.json?q=${query}&sort=new`;
  try {
    const response = await fetch(`https://cors-anywhere.herokuapp.com/${url}`);
    const data = await response.json();
    return data.data.children.map(post => ({
      platform: 'Reddit',
      username: post.data.author,
      bio: post.data.title + ' ' + post.data.selftext,
      link: `https://www.reddit.com${post.data.permalink}`,
      distance: filters.location.lat ? '~' + filters.radius + ' km' : filters.location.city,
      image: post.data.thumbnail && post.data.thumbnail !== 'self' ? post.data.thumbnail : null,
      date: new Date(post.data.created_utc * 1000).toISOString()
    })).filter(profile => matchesFilters(profile));
  } catch (error) {
    console.error('Erreur Reddit:', error);
    return [];
  }
}

async function scrapeFetLife() {
  const { radius, location } = filters;
  const cities = location.city ? [location.city] : ['Paris', 'Lyon', 'Marseille'];
  const results = [];
  
  for (const city of cities) {
    try {
      const groupUrl = `https://fetlife.com/groups/${city.toLowerCase()}`;
      const response = await fetch(`https://cors-anywhere.herokuapp.com/${groupUrl}`);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const posts = doc.querySelectorAll('.post');
      posts.forEach(post => {
        const username = post.querySelector('.username')?.textContent || 'Anonyme';
        const bio = post.querySelector('.bio')?.textContent || '';
        const link = post.querySelector('a')?.href || groupUrl;
        results.push({
          platform: 'FetLife',
          username: username,
          bio: bio,
          link: link,
          distance: location.lat ? '~' + radius + ' km' : city,
          image: null,
          date: null
        });
      });
    } catch (error) {
      console.error(`Erreur FetLife pour ${city}:`, error);
    }
  }
  return results.filter(profile => matchesFilters(profile));
}

async function searchAll() {
  updateFilters();
  const results = [];
  document.getElementById('results').innerHTML = '<div class="loading"><div class="spinner"></div><p>Recherche en cours...</p></div>';
  
  const scrapingResults = await Promise.allSettled([scrapeReddit(), scrapeFetLife()]);
  scrapingResults.forEach(result => {
    if (result.status === 'fulfilled') results.push(...result.value);
  });
  
  displayResults(results);
  saveToHistory(filters, results.length);
}

function displayResults(results) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = results.length === 0 ? '<p class="no-results">Aucun résultat trouvé. Essayez d\'élargir vos critères.</p>' : '';
  
  results.forEach(result => {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    
    const favoriteButton = document.createElement('button');
    favoriteButton.className = 'favorite-button';
    favoriteButton.innerHTML = '<i class="fas fa-heart"></i>';
    favoriteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(result);
      favoriteButton.classList.toggle('favorited');
    });
    
    const favorites = JSON.parse(localStorage.getItem('lAntreFavorites')) || [];
    if (favorites.some(fav => fav.link === result.link)) {
      favoriteButton.classList.add('favorited');
    }
    
    const profileImg = document.createElement('img');
    profileImg.src = result.image || 'assets/default-profile.png';
    profileImg.alt = 'Profile';
    profileImg.onerror = () => { profileImg.src = 'assets/default-profile.png'; };
    
    const resultInfo = document.createElement('div');
    resultInfo.className = 'result-info';
    resultInfo.innerHTML = `
      <h3>${result.username || 'Anonyme'}</h3>
      <p>${result.bio || 'Aucune description'}</p>
      <p class="distance"><i class="fas fa-map-marker-alt"></i> ${result.distance}</p>
      <a href="${result.link}" target="_blank" class="btn btn-secondary"><i class="fas fa-external-link-alt"></i> Voir le profil</a>
    `;
    
    resultCard.appendChild(favoriteButton);
    resultCard.appendChild(profileImg);
    resultCard.appendChild(resultInfo);
    
    resultCard.addEventListener('click', () => {
      showProfileModal(result);
    });
    
    resultsDiv.appendChild(resultCard);
  });
  document.getElementById('result-count').textContent = results.length;
}

function showProfileModal(profile) {
  const modal = document.getElementById('profile-modal');
  const modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = `
    <img src="${profile.image || 'assets/default-profile.png'}" alt="Profile" onerror="this.src='assets/default-profile.png';">
    <h2>${profile.username || 'Anonyme'}</h2>
    <p><strong>Plateforme:</strong> ${profile.platform}</p>
    <p><strong>Bio:</strong> ${profile.bio || 'Aucune description'}</p>
    <p><strong>Distance:</strong> ${profile.distance}</p>
    <a href="${profile.link}" target="_blank" class="btn btn-primary"><i class="fas fa-external-link-alt"></i> Voir le profil complet</a>
  `;
  modal.style.display = 'block';
}

document.querySelector('.close-modal').addEventListener('click', () => {
  document.getElementById('profile-modal').style.display = 'none';
});

window.onclick = function(event) {
  const modal = document.getElementById('profile-modal');
  if (event.target == modal) {
    modal.style.display = 'none';
  }
}

window.scrapeReddit = scrapeReddit;
window.scrapeFetLife = scrapeFetLife;
window.searchAll = searchAll;
window.displayResults = displayResults;
window.showProfileModal = showProfileModal;