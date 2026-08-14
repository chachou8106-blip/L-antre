const filters = {
  location: { lat: null, lng: null, city: null },
  radius: 50,
  gender: ['Femme'],
  role: ['Dominatrice', 'Soumis'],
  practices: ['Sodomie', 'Femdom'],
  attributes: ['Gros seins'],
  excludePros: true
};

function updateFilters() {
  filters.radius = parseInt(document.getElementById('radius-select').value);
  filters.location.city = document.getElementById('city-input').value;
  
  const genderSelect = document.getElementById('gender-select');
  filters.gender = Array.from(genderSelect.selectedOptions).map(option => option.value);
  
  const roleSelect = document.getElementById('role-select');
  filters.role = Array.from(roleSelect.selectedOptions).map(option => option.value);
  
  const practiceCheckboxes = document.querySelectorAll('input[name="practice"]:checked');
  filters.practices = Array.from(practiceCheckboxes).map(checkbox => checkbox.value);
  
  const attributeCheckboxes = document.querySelectorAll('input[name="attribute"]:checked');
  filters.attributes = Array.from(attributeCheckboxes).map(checkbox => checkbox.value);
}

function matchesFilters(profile) {
  const { gender, role, practices, attributes, excludePros } = filters;
  
  if (gender.length > 0 && profile.gender && !gender.some(g => profile.gender.includes(g))) return false;
  if (role.length > 0 && profile.role && !role.some(r => profile.role.includes(r))) return false;
  if (practices.length > 0 && profile.bio && !practices.some(p => profile.bio.includes(p))) return false;
  if (attributes.length > 0 && profile.bio && !attributes.some(a => profile.bio.includes(a))) return false;
  if (excludePros && profile.bio && /pro|tarif|payant/.test(profile.bio)) return false;
  
  return true;
}

window.filters = filters;
window.updateFilters = updateFilters;
window.matchesFilters = matchesFilters;