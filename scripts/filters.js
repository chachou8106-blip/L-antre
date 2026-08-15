// Gestion complète des filtres pour L'Antre

/**
 * Objet global contenant tous les filtres de recherche
 */
const filters = {
  // Localisation
  location: {
    lat: null,
    lng: null,
    city: null,
    country: 'fr'
  },
  
  // Critères de base
  radius: 50,
  sortBy: 'recent',
  
  // Filtres principaux
  gender: ['Femme'],
  role: ['Dominatrice', 'Soumis', 'Amatrice'],
  practices: ['Sodomie', 'Anal', 'Femdom'],
  attributes: ['Gros seins'],
  
  // Âge
  ageMin: 18,
  ageMax: 99,
  
  // Exclusions
  excludePros: true,
  excludeVerified: false,
  excludeNoPic: false,
  excludeOld: true
};

/**
 * Met à jour les filtres à partir des éléments du DOM
 */
function updateFilters() {
  // Localisation
  filters.radius = parseInt(document.getElementById('radius-select').value);
  filters.location.city = document.getElementById('city-input').value;
  filters.location.country = document.getElementById('country-select')?.value || 'fr';
  
  // Genre
  const genderSelect = document.getElementById('gender-select');
  if (genderSelect) {
    filters.gender = Array.from(genderSelect.selectedOptions).map(option => option.value);
  }
  
  // Rôle BDSM
  const roleSelect = document.getElementById('role-select');
  if (roleSelect) {
    filters.role = Array.from(roleSelect.selectedOptions).map(option => option.value);
  }
  
  // Pratiques
  const practiceCheckboxes = document.querySelectorAll('input[name="practice"]:checked');
  filters.practices = Array.from(practiceCheckboxes).map(checkbox => checkbox.value);
  
  // Attributs physiques
  const attributeCheckboxes = document.querySelectorAll('input[name="attribute"]:checked');
  filters.attributes = Array.from(attributeCheckboxes).map(checkbox => checkbox.value);
  
  // Âge
  const ageMinInput = document.getElementById('age-min');
  const ageMaxInput = document.getElementById('age-max');
  if (ageMinInput && ageMaxInput) {
    filters.ageMin = parseInt(ageMinInput.value);
    filters.ageMax = parseInt(ageMaxInput.value);
    
    // Mettre à jour l'affichage des valeurs d'âge
    const ageMinValue = document.getElementById('age-min-value');
    const ageMaxValue = document.getElementById('age-max-value');
    if (ageMinValue && ageMaxValue) {
      ageMinValue.textContent = filters.ageMin;
      ageMaxValue.textContent = filters.ageMax;
    }
  }
  
  // Tri
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    filters.sortBy = sortSelect.value;
  }
  
  // Exclusions
  filters.excludePros = document.getElementById('exclude-pros')?.checked || false;
  filters.excludeVerified = document.getElementById('exclude-verified')?.checked || false;
  filters.excludeNoPic = document.getElementById('exclude-no-pic')?.checked || false;
  filters.excludeOld = document.getElementById('exclude-old')?.checked || true;
}

/**
 * Construire la requête pour Reddit
 * @returns {string} - Requête encodée pour Reddit
 */
function buildRedditQuery() {
  const { gender, role, practices, attributes, excludePros, location } = filters;
  let query = [];
  
  // Ajouter les genres
  if (gender.length > 0) {
    query.push(...gender.map(g => g.toLowerCase()));
  }
  
  // Ajouter les rôles
  if (role.length > 0) {
    query.push(...role.map(r => r.toLowerCase()));
  }
  
  // Ajouter les pratiques
  if (practices.length > 0) {
    query.push(...practices.map(p => p.toLowerCase()));
  }
  
  // Ajouter les attributs
  if (attributes.length > 0) {
    query.push(...attributes.map(a => a.toLowerCase()));
  }
  
  // Ajouter des mots-clés par défaut
  query.push('rencontre', 'bdsm', 'libertin', 'sex', 'plan cul');
  
  // Exclure les pros
  if (excludePros) {
    query.push('-pro', '-tarif', '-payant', '-professionnelle', '-escort', '-€', '-$');
  }
  
  // Ajouter la localisation si une ville est spécifiée
  if (location.city) {
    query.push(location.city.toLowerCase());
  }
  
  return encodeURIComponent(query.join(' OR '));
}

/**
 * Construire la requête pour Google Maps
 * @returns {string} - Requête pour Google Maps
 */
function buildGoogleMapsQuery() {
  const { practices, attributes } = filters;
  let query = [];
  
  if (practices.length > 0) {
    query.push(...practices.map(p => p.toLowerCase()));
  }
  
  if (attributes.length > 0) {
    query.push(...attributes.map(a => a.toLowerCase()));
  }
  
  query.push('club', 'soirée', 'rencontre', 'bdsm', 'libertin', 'femdom');
  
  return query.join('+');
}

/**
 * Vérifie si un profil correspond aux filtres
 * @param {Object} profile - Le profil à vérifier
 * @returns {boolean} - True si le profil correspond, False sinon
 */
function matchesFilters(profile) {
  const { gender, role, practices, attributes, ageMin, ageMax, excludePros, excludeVerified, excludeNoPic, excludeOld } = filters;
  
  // Vérifier le genre
  if (gender.length > 0 && profile.gender) {
    const profileGender = profile.gender.toLowerCase();
    if (!gender.some(g => profileGender.includes(g.toLowerCase()))) {
      return false;
    }
  }
  
  // Vérifier le rôle
  if (role.length > 0 && profile.role) {
    const profileRole = profile.role.toLowerCase();
    if (!role.some(r => profileRole.includes(r.toLowerCase()))) {
      return false;
    }
  }
  
  // Vérifier les pratiques (dans la bio)
  if (practices.length > 0 && profile.bio) {
    const bioLower = profile.bio.toLowerCase();
    if (!practices.some(p => bioLower.includes(p.toLowerCase()))) {
      return false;
    }
  }
  
  // Vérifier les attributs (dans la bio)
  if (attributes.length > 0 && profile.bio) {
    const bioLower = profile.bio.toLowerCase();
    if (!attributes.some(a => bioLower.includes(a.toLowerCase()))) {
      return false;
    }
  }
  
  // Vérifier l'âge
  if (profile.age && (profile.age < ageMin || profile.age > ageMax)) {
    return false;
  }
  
  // Exclure les pros
  if (excludePros && profile.bio) {
    const bioLower = profile.bio.toLowerCase();
    if (bioLower.includes('pro') || 
        bioLower.includes('tarif') || 
        bioLower.includes('payant') ||
        bioLower.includes('€') ||
        bioLower.includes('$') ||
        bioLower.includes('professionnelle') ||
        bioLower.includes('escort')) {
      return false;
    }
  }
  
  // Exclure les vérifiés
  if (excludeVerified && profile.verified) {
    return false;
  }
  
  // Exclure les profils sans photo
  if (excludeNoPic && !profile.image) {
    return false;
  }
  
  // Exclure les vieux profils (si date disponible)
  if (excludeOld && profile.date) {
    const postDate = new Date(profile.date);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    if (postDate < oneMonthAgo) {
      return false;
    }
  }
  
  return true;
}

// Exporter les variables et fonctions pour les autres scripts
window.filters = filters;
window.updateFilters = updateFilters;
window.buildRedditQuery = buildRedditQuery;
window.buildGoogleMapsQuery = buildGoogleMapsQuery;
window.matchesFilters = matchesFilters;
