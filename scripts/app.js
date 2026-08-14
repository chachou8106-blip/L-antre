document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('search-button').addEventListener('click', searchAll);
  document.querySelectorAll('select, input[type="checkbox"]').forEach(element => {
    element.addEventListener('change', updateFilters);
  });
  initGeolocation();
});