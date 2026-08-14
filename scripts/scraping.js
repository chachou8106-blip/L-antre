async function scrapeReddit() {
  const query = encodeURIComponent(
    [...filters.gender, ...filters.role, ...filters.practices, ...filters.attributes, 'rencontre', 'bdsm'].join(' OR ')
  );
  const url = `https://www.reddit.com/r/DirtyR4R/search.json?q=${query}&sort=new`;
  
  try {
    const response = await fetch(`https://cors-anywhere.herokuapp.com/${url}`);
    const data = await response.json();
    
    return data.data.children.map(post => ({
      platform: 'Reddit',
      username: post.data.author,
      bio: post.data.title + ' ' + post.data.selftext,
      link: `https://www.reddit.com${post.data.permalink}`,
      distance: filters.location.city || '~50 km'
    })).filter(profile => matchesFilters(profile));
  } catch (error) {
    console.error('Erreur Reddit:', error);
    return [];
  }
}

async function searchAll() {
  updateFilters();
  const results = await scrapeReddit();
  const resultsDiv = document.getElementById('results');
  
  resultsDiv.innerHTML = results.length === 0 ? '<p>Aucun résultat trouvé.</p>' : '';
  
  results.forEach(result => {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    resultCard.innerHTML = `
      <h3>${result.username || 'Anonyme'}</h3>
      <p>${result.bio || 'Aucune description'}</p>
      <p><i class="fas fa-map-marker-alt"></i> ${result.distance}</p>
      <a href="${result.link}" target="_blank">Voir le profil</a>
    `;
    resultsDiv.appendChild(resultCard);
  });
  
  document.getElementById('result-count').textContent = results.length;
}

window.scrapeReddit = scrapeReddit;
window.searchAll = searchAll;