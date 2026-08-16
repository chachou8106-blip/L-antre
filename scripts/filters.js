// Gestion des filtres de recherche de L'Antre

/**
 * Objet global contenant tous les filtres.
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
  excludeOld: true,

  // Sources activées (voir sources.js)
  sources: ['reddit', 'fetlife', 'maps', 'forums', 'craigslist', 'web'],

  // Analyse d'image (voir vision.js)
  vision: {
    enabled: false,
    hideNonPhoto: false
  }
};

/** Termes qui trahissent une annonce professionnelle / payante. */
const PRO_TERMS = ['pro', 'pros', 'tarif', 'tarifs', 'payant', 'payante', 'professionnel',
  'professionnelle', 'escort', 'escorte', 'salon', 'massage tantrique', '€', '$'];

/**
 * Lit la valeur d'une case à cocher sans écraser un `false` légitime.
 * @param {string} id
 * @param {boolean} fallback
 * @returns {boolean}
 */
function readCheckbox(id, fallback) {
  const element = document.getElementById(id);
  return element ? element.checked : fallback;
}

/**
 * Met à jour l'objet `filters` à partir du DOM.
 */
function updateFilters() {
  const radiusSelect = document.getElementById('radius-select');
  if (radiusSelect) filters.radius = parseInt(radiusSelect.value, 10) || 50;

  const cityInput = document.getElementById('city-input');
  if (cityInput) {
    const city = cityInput.value.trim();
    filters.location.city = city || null;
  }

  const countrySelect = document.getElementById('country-select');
  if (countrySelect) filters.location.country = countrySelect.value;

  const genderSelect = document.getElementById('gender-select');
  if (genderSelect) {
    filters.gender = Array.from(genderSelect.selectedOptions).map(option => option.value);
  }

  const roleSelect = document.getElementById('role-select');
  if (roleSelect) {
    filters.role = Array.from(roleSelect.selectedOptions).map(option => option.value);
  }

  filters.practices = Array.from(document.querySelectorAll('input[name="practice"]:checked'))
    .map(checkbox => checkbox.value);

  filters.attributes = Array.from(document.querySelectorAll('input[name="attribute"]:checked'))
    .map(checkbox => checkbox.value);

  filters.sources = Array.from(document.querySelectorAll('input[name="source"]:checked'))
    .map(checkbox => checkbox.value);

  const ageMinInput = document.getElementById('age-min');
  const ageMaxInput = document.getElementById('age-max');
  if (ageMinInput && ageMaxInput) {
    let min = parseInt(ageMinInput.value, 10);
    let max = parseInt(ageMaxInput.value, 10);

    // Les deux curseurs partagent la même plage : on les empêche de se croiser.
    if (min > max) {
      if (document.activeElement === ageMinInput) {
        max = min;
        ageMaxInput.value = String(max);
      } else {
        min = max;
        ageMinInput.value = String(min);
      }
    }

    filters.ageMin = min;
    filters.ageMax = max;

    const ageMinValue = document.getElementById('age-min-value');
    const ageMaxValue = document.getElementById('age-max-value');
    if (ageMinValue) ageMinValue.textContent = String(min);
    if (ageMaxValue) ageMaxValue.textContent = String(max);
  }

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) filters.sortBy = sortSelect.value;

  filters.excludePros = readCheckbox('exclude-pros', filters.excludePros);
  filters.excludeVerified = readCheckbox('exclude-verified', filters.excludeVerified);
  filters.excludeNoPic = readCheckbox('exclude-no-pic', filters.excludeNoPic);
  filters.excludeOld = readCheckbox('exclude-old', filters.excludeOld);

  filters.vision.enabled = readCheckbox('vision-enabled', filters.vision.enabled);
  filters.vision.hideNonPhoto = readCheckbox('vision-hide-nonphoto', filters.vision.hideNonPhoto);
}

/**
 * Mots-clés retenus pour interroger les moteurs de recherche.
 * @param {number} limit - Nombre maximum de mots-clés.
 * @returns {string[]}
 */
function keywordTerms(limit = 8) {
  const terms = [...filters.role, ...filters.practices, ...filters.attributes]
    .map(term => term.trim())
    .filter(Boolean);

  // Dédupliquer sans perdre l'ordre de priorité (rôles d'abord).
  return Array.from(new Set(terms)).slice(0, limit);
}

/**
 * Terme de localisation utilisable dans une requête texte.
 * @returns {string}
 */
function locationTerm() {
  return filters.location.city || '';
}

/**
 * Construit la requête de recherche Reddit.
 * Syntaxe Reddit : les groupes OR entre parenthèses, exclusions avec NOT.
 * @returns {string} - Requête brute (non encodée).
 */
function buildRedditQuery() {
  const parts = [];
  const terms = keywordTerms(8).map(term => (term.includes(' ') ? `"${term}"` : term));

  if (terms.length) parts.push(`(${terms.join(' OR ')})`);

  const city = locationTerm();
  if (city) parts.push(city.includes(' ') ? `"${city}"` : city);

  let query = parts.join(' AND ');

  if (filters.excludePros) {
    query += ' NOT (escort OR tarif OR payant OR professionnelle)';
  }

  // Reddit tronque au-delà de ~512 caractères.
  return query.slice(0, 500);
}

/**
 * Construit la requête « lieux » (Google Maps, annuaires).
 * @returns {string}
 */
function buildPlacesQuery() {
  const city = locationTerm();
  const base = ['club libertin', 'sauna libertin', 'soirée bdsm'];
  return [...base, city].filter(Boolean).join(' ');
}

/**
 * Construit une requête générique pour un moteur de recherche web.
 * @returns {string}
 */
function buildWebQuery() {
  const terms = keywordTerms(5);
  const city = locationTerm();
  return [...terms, city, 'rencontre'].filter(Boolean).join(' ');
}

/**
 * Niveau de zoom Google Maps correspondant au rayon choisi.
 * @returns {number}
 */
function radiusToZoom() {
  const table = { 5: 13, 10: 12, 25: 11, 50: 10, 100: 9, 200: 8 };
  return table[filters.radius] || 11;
}

/**
 * Vérifie qu'un résultat correspond aux filtres.
 * Les cartes de type « lien » (recherches sur un site tiers) ne sont jamais
 * filtrées : ce ne sont pas des profils.
 * @param {Object} result
 * @returns {boolean}
 */
function matchesFilters(result) {
  if (!result) return false;
  if (result.type === 'link') return true;

  const bio = `${result.title || ''} ${result.bio || ''}`;

  if (filters.gender.length && result.gender) {
    if (!filters.gender.some(gender => containsTerm(result.gender, gender))) return false;
  }

  if (filters.role.length && result.role) {
    if (!filters.role.some(role => containsTerm(result.role, role))) return false;
  }

  // Pratiques et attributs sont cherchés dans le texte de l'annonce.
  if (filters.practices.length && bio.trim()) {
    if (!filters.practices.some(practice => containsTerm(bio, practice))) return false;
  }

  if (filters.attributes.length && bio.trim()) {
    if (!filters.attributes.some(attribute => containsTerm(bio, attribute))) return false;
  }

  const age = result.age || extractAge(bio);
  if (age && (age < filters.ageMin || age > filters.ageMax)) return false;

  if (filters.excludePros && PRO_TERMS.some(term => containsTerm(bio, term))) return false;

  if (filters.excludeVerified && result.verified) return false;

  if (filters.excludeNoPic && !result.image) return false;

  if (filters.excludeOld && result.date) {
    const postDate = new Date(result.date);
    const limit = new Date();
    limit.setMonth(limit.getMonth() - 1);
    if (postDate < limit) return false;
  }

  return true;
}

window.filters = filters;
window.updateFilters = updateFilters;
window.keywordTerms = keywordTerms;
window.buildRedditQuery = buildRedditQuery;
window.buildPlacesQuery = buildPlacesQuery;
window.buildWebQuery = buildWebQuery;
window.radiusToZoom = radiusToZoom;
window.matchesFilters = matchesFilters;
