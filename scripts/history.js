// Gestion de l'historique des recherches

/**
 * Sauvegarde une recherche dans l'historique
 * @param {Object} filters - Les filtres utilisés pour la recherche
 * @param {number} resultCount - Le nombre de résultats trouvés
 */
function saveToHistory(filters, resultCount) {
  // Récupérer l'historique existant ou créer un tableau vide
  let history = JSON.parse(localStorage.getItem('lAntreHistory')) || [];
  
  // Créer un nouvel élément d'historique
  const historyItem = {
    id: Date.now(), // ID unique basé sur le timestamp
    date: new Date().toLocaleString('fr-FR'),
    filters: {
      location: {...filters.location},
      radius: filters.radius,
      gender: [...filters.gender],
      role: [...filters.role],
      practices: [...filters.practices],
      attributes: [...filters.attributes],
      ageMin: filters.ageMin,
      ageMax: filters.ageMax,
      excludePros: filters.excludePros,
      excludeVerified: filters.excludeVerified,
      excludeNoPic: filters.excludeNoPic,
      excludeOld: filters.excludeOld
    },
    resultCount: resultCount
  };
  
  // Ajouter le nouvel élément au début de l'historique
  history.unshift(historyItem);
  
  // Limiter l'historique à 20 éléments maximum
  if (history.length > 20) {
    history = history.slice(0, 20);
  }
  
  // Sauvegarder dans le localStorage
  localStorage.setItem('lAntreHistory', JSON.stringify(history));
  
  // Mettre à jour l'affichage
  updateHistoryDisplay();
}

/**
 * Met à jour l'affichage de l'historique
 */
function updateHistoryDisplay() {
  const history = JSON.parse(localStorage.getItem('lAntreHistory')) || [];
  const historyDiv = document.getElementById('history');
  
  if (!historyDiv) return;
  
  historyDiv.innerHTML = '';
  
  if (history.length === 0) {
    historyDiv.innerHTML = '<p class="no-results">Aucune recherche dans l\'historique.</p>';
    return;
  }
  
  // Créer un élément pour chaque recherche dans l'historique
  history.forEach(item => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
      <div class="history-header">
        <span class="history-date"><i class="fas fa-clock"></i> ${item.date}</span>
        <span class="history-count">${item.resultCount} résultat(s)</span>
      </div>
      <div class="history-filters">
        <p><strong>Localisation:</strong> ${item.filters.location.city || 'GPS'}</p>
        <p><strong>Rayon:</strong> ${item.filters.radius} km</p>
        <p><strong>Genres:</strong> ${item.filters.gender.join(', ') || 'Aucun'}</p>
        <p><strong>Rôles:</strong> ${item.filters.role.join(', ') || 'Aucun'}</p>
        ${item.filters.practices.length > 0 ? `<p><strong>Pratiques:</strong> ${item.filters.practices.join(', ')}</p>` : ''}
        ${item.filters.attributes.length > 0 ? `<p><strong>Attributs:</strong> ${item.filters.attributes.join(', ')}</p>` : ''}
      </div>
    `;
    
    // Ajouter un événement pour recharger les filtres et relancer la recherche
    historyItem.addEventListener('click', () => {
      loadFilters(item.filters);
      showNotification('Filtres chargés depuis l\'historique', 'info');
    });
    
    historyDiv.appendChild(historyItem);
  });
}

/**
 * Formate les filtres pour l'affichage
 * @param {Object} filters - Les filtres à formater
 * @returns {string} - Une chaîne formatée
 */
function formatFilters(filters) {
  const parts = [];
  
  if (filters.gender && filters.gender.length > 0) {
    parts.push(`Genre: ${filters.gender.join(', ')}`);
  }
  if (filters.role && filters.role.length > 0) {
    parts.push(`Rôle: ${filters.role.join(', ')}`);
  }
  if (filters.practices && filters.practices.length > 0) {
    parts.push(`Pratiques: ${filters.practices.join(', ')}`);
  }
  if (filters.attributes && filters.attributes.length > 0) {
    parts.push(`Attributs: ${filters.attributes.join(', ')}`);
  }
  if (filters.radius) {
    parts.push(`Rayon: ${filters.radius} km`);
  }
  
  return parts.join(' | ');
}

/**
 * Charge des filtres prédéfinis dans l'interface
 * @param {Object} savedFilters - Les filtres à charger
 */
function loadFilters(savedFilters) {
  // Charger la localisation
  if (savedFilters.location) {
    filters.location = {...savedFilters.location};
    
    if (savedFilters.location.city) {
      document.getElementById('city-input').value = savedFilters.location.city;
    }
    
    if (savedFilters.location.lat && savedFilters.location.lng) {
      userLat = savedFilters.location.lat;
      userLng = savedFilters.location.lng;
    }
  }
  
  // Charger le rayon
  if (savedFilters.radius) {
    document.getElementById('radius-select').value = savedFilters.radius;
    filters.radius = savedFilters.radius;
  }
  
  // Charger les genres
  if (savedFilters.gender && savedFilters.gender.length > 0) {
    const genderSelect = document.getElementById('gender-select');
    Array.from(genderSelect.options).forEach(option => {
      option.selected = savedFilters.gender.includes(option.value);
    });
    filters.gender = [...savedFilters.gender];
  }
  
  // Charger les rôles
  if (savedFilters.role && savedFilters.role.length > 0) {
    const roleSelect = document.getElementById('role-select');
    Array.from(roleSelect.options).forEach(option => {
      option.selected = savedFilters.role.includes(option.value);
    });
    filters.role = [...savedFilters.role];
  }
  
  // Charger les pratiques
  if (savedFilters.practices && savedFilters.practices.length > 0) {
    document.querySelectorAll('input[name="practice"]').forEach(checkbox => {
      checkbox.checked = savedFilters.practices.includes(checkbox.value);
    });
    filters.practices = [...savedFilters.practices];
  }
  
  // Charger les attributs
  if (savedFilters.attributes && savedFilters.attributes.length > 0) {
    document.querySelectorAll('input[name="attribute"]').forEach(checkbox => {
      checkbox.checked = savedFilters.attributes.includes(checkbox.value);
    });
    filters.attributes = [...savedFilters.attributes];
  }
  
  // Charger l'âge
  if (savedFilters.ageMin !== undefined) {
    document.getElementById('age-min').value = savedFilters.ageMin;
    document.getElementById('age-min-value').textContent = savedFilters.ageMin;
    filters.ageMin = savedFilters.ageMin;
  }
  
  if (savedFilters.ageMax !== undefined) {
    document.getElementById('age-max').value = savedFilters.ageMax;
    document.getElementById('age-max-value').textContent = savedFilters.ageMax;
    filters.ageMax = savedFilters.ageMax;
  }
  
  // Charger les exclusions
  if (savedFilters.excludePros !== undefined) {
    document.getElementById('exclude-pros').checked = savedFilters.excludePros;
    filters.excludePros = savedFilters.excludePros;
  }
  
  if (savedFilters.excludeVerified !== undefined) {
    document.getElementById('exclude-verified').checked = savedFilters.excludeVerified;
    filters.excludeVerified = savedFilters.excludeVerified;
  }
  
  if (savedFilters.excludeNoPic !== undefined) {
    document.getElementById('exclude-no-pic').checked = savedFilters.excludeNoPic;
    filters.excludeNoPic = savedFilters.excludeNoPic;
  }
  
  if (savedFilters.excludeOld !== undefined) {
    document.getElementById('exclude-old').checked = savedFilters.excludeOld;
    filters.excludeOld = savedFilters.excludeOld;
  }
  
  // Activer le bouton de recherche si une localisation est définie
  enableSearchButton();
}

// Exporter les fonctions pour les autres scripts
window.saveToHistory = saveToHistory;
window.updateHistoryDisplay = updateHistoryDisplay;
window.loadFilters = loadFilters;
window.formatFilters = formatFilters;
