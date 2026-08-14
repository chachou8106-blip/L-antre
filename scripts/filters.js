// Gestion des filtres
const filters = {
  location: { lat: null, lng: null, city: null, country: 'fr' },
  radius: 50,
  sortBy: 'recent',
  gender: ['Femme'],
  role: ['Dominatrice', 'Soumis', 'Amatrice'],
  practices: ['Sodomie', 'Anal', 'Femdom'],
  attributes: ['Gros seins'],
  ageMin: 18,
  ageMax: 99,
  excludePros: true,
  excludeVerified: false,
  excludeNoPic: false,
  excludeOld: true
};

function updateFilters() {
  filters.radius = parseInt(document.getElementById('radius-select').value);
  filters.location.city = document.getElementById('city-input').value;
  filters.location.country = document.getElementById('country-select').value;
  
  const genderSelect = document.getElementById('gender-select');
  filters.gender = Array.from(genderSelect.selectedOptions).map(option => option.value);
  
  const roleSelect = document.getElementById('role-select');
  filters.role = Array.from(roleSelect.selectedOptions).map(option => option.value);
  
  const practiceCheckboxes = document.querySelectorAll('input[name="practice"]:checked');
  filters.practices = Array.from(practiceCheckboxes).map(checkbox => checkbox.value);
  
  const attributeCheckboxes = document.querySelectorAll('input[name="attribute"]:checked');
  filters.attributes = Array.from(attributeCheckboxes).map(checkbox => checkbox.value);
  
  filters.ageMin = parseInt(document.getElementById('age-min').value);
  filters.ageMax = parseInt(document.getElementById('age-max').value);
  document.getElementById('age-min-value').textContent = filters.ageMin;
  document.getElementById('age-max-value').textContent = filters.ageMax;
  
  filters.sortBy = document.getElementById('sort-select').value;
  filters.excludePros = document.getElementById('exclude-pros').checked;
  filters.excludeVerified = document.getElementById('exclude-verified').checked;
  filters.excludeNoPic = document.getElementById('exclude-no-pic').checked;
  filters.excludeOld = document.getElementById('exclude-old').checked;
}

function buildRedditQuery() {
  const { gender, role, practices, attributes, excludePros, location } = filters;
  let query = [...gender, ...role, ...practices, ...attributes, 'rencontre', 'bdsm', 'libertin', 'sex'];
  if (excludePros) query.push('-pro', '-tarif', '-payant', '-professionnelle', '-escort');
  if (location.city) query.push(location.city.toLowerCase());
  return encodeURIComponent(query.join(' OR '));
}

function buildGoogleMapsQuery() {
  const { practices, attributes } = filters;
  let query = [...practices, ...attributes, 'club', 'soirée', 'rencontre', 'bdsm', 'libertin'];
  return query.join('+');
}

function matchesFilters(profile) {
  const { gender, role, practices, attributes, ageMin, ageMax, excludePros, excludeVerified, excludeNoPic, excludeOld } = filters;
  
  if (gender.length > 0 && profile.gender && !gender.some(g => profile.gender.toLowerCase().includes(g.toLowerCase()))) return false;
  if (role.length > 0 && profile.role && !role.some(r => profile.role.toLowerCase().includes(r.toLowerCase()))) return false;
  if (practices.length > 0 && profile.bio && !practices.some(p => profile.bio.toLowerCase().includes(p.toLowerCase()))) return false;
  if (attributes.length > 0 && profile.bio && !attributes.some(a => profile.bio.toLowerCase().includes(a.toLowerCase()))) return false;
  if (profile.age && (profile.age < ageMin || profile.age > ageMax)) return false;
  if (excludePros && profile.bio && /pro|tarif|payant|€|\$|professionnelle|escort/.test(profile.bio.toLowerCase())) return false;
  if (excludeVerified && profile.verified) return false;
  if (excludeNoPic && !profile.image) return false;
  if (excludeOld && profile.date) {
    const postDate = new Date(profile.date);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    if (postDate < oneMonthAgo) return false;
  }
  return true;
}

window.filters = filters;
window.updateFilters = updateFilters;
window.buildRedditQuery = buildRedditQuery;
window.buildGoogleMapsQuery = buildGoogleMapsQuery;
window.matchesFilters = matchesFilters;