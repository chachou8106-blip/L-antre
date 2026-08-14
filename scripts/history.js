function saveToHistory(filters, resultCount) {
  const history = JSON.parse(localStorage.getItem('lAntreHistory')) || [];
  const historyItem = {
    date: new Date().toLocaleString('fr-FR'),
    filters: { ...filters },
    resultCount: resultCount
  };
  history.unshift(historyItem);
  localStorage.setItem('lAntreHistory', JSON.stringify(history));
  updateHistoryDisplay();
}

function updateHistoryDisplay() {
  const history = JSON.parse(localStorage.getItem('lAntreHistory')) || [];
  const historyDiv = document.getElementById('history');
  historyDiv.innerHTML = '';
  
  history.slice(0, 5).forEach(item => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
      <h4>${item.date}</h4>
      <p>Recherche : ${formatFilters(item.filters)}</p>
      <p>Résultats : ${item.resultCount}</p>
    `;
    historyItem.addEventListener('click', () => {
      loadFilters(item.filters);
      searchAll();
    });
    historyDiv.appendChild(historyItem);
  });
}

function formatFilters(filters) {
  const parts = [];
  if (filters.gender.length > 0) parts.push(`Genre: ${filters.gender.join(', ')}`);
  if (filters.role.length > 0) parts.push(`Rôle: ${filters.role.join(', ')}`);
  if (filters.practices.length > 0) parts.push(`Pratiques: ${filters.practices.join(', ')}`);
  if (filters.attributes.length > 0) parts.push(`Attributs: ${filters.attributes.join(', ')}`);
  parts.push(`Rayon: ${filters.radius} km`);
  return parts.join(' | ');
}

function loadFilters(savedFilters) {
  document.getElementById('gender-select').selectedOptions = Array.from(document.getElementById('gender-select').options).filter(option => savedFilters.gender.includes(option.value));
  document.getElementById('role-select').selectedOptions = Array.from(document.getElementById('role-select').options).filter(option => savedFilters.role.includes(option.value));
  
  document.querySelectorAll('input[name="practice"]').forEach(checkbox => {
    checkbox.checked = savedFilters.practices.includes(checkbox.value);
  });
  
  document.querySelectorAll('input[name="attribute"]').forEach(checkbox => {
    checkbox.checked = savedFilters.attributes.includes(checkbox.value);
  });
  
  document.getElementById('age-min').value = savedFilters.ageMin;
  document.getElementById('age-max').value = savedFilters.ageMax;
  document.getElementById('age-min-value').textContent = savedFilters.ageMin;
  document.getElementById('age-max-value').textContent = savedFilters.ageMax;
  
  document.getElementById('radius-select').value = savedFilters.radius;
  document.getElementById('exclude-pros').checked = savedFilters.excludePros;
  document.getElementById('exclude-verified').checked = savedFilters.excludeVerified;
  document.getElementById('exclude-no-pic').checked = savedFilters.excludeNoPic;
  document.getElementById('exclude-old').checked = savedFilters.excludeOld;
  
  if (savedFilters.location.lat && savedFilters.location.lng) {
    userLat = savedFilters.location.lat;
    userLng = savedFilters.location.lng;
    filters.location = { ...savedFilters.location };
  } else if (savedFilters.location.city) {
    document.getElementById('city-input').value = savedFilters.location.city;
    filters.location.city = savedFilters.location.city;
  }
  
  updateFilters();
  enableSearchButton();
}

window.saveToHistory = saveToHistory;
window.updateHistoryDisplay = updateHistoryDisplay;
window.loadFilters = loadFilters;