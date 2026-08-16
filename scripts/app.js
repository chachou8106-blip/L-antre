// Point d'entrée de L'Antre : câblage de l'interface et cycle de recherche.

(() => {
  const dom = {};
  let searching = false;

  function cacheDom() {
    const ids = [
      'use-gps', 'position-label', 'city-input', 'country-select', 'radius-select',
      'only-located', 'free-keywords', 'gender-select', 'role-select',
      'age-min', 'age-max', 'age-min-value', 'age-max-value',
      'max-age-select', 'match-mode', 'sort-select', 'exclude-pros',
      'search-button', 'clear-results', 'clear-all-data',
      'results', 'result-count', 'diagnostics', 'external-links',
      'favorites', 'favorites-count', 'history', 'profile-modal'
    ];
    for (const id of ids) {
      dom[id] = document.getElementById(id);
    }
  }

  // --------------------------------------------------------------------------
  // Filtres ⇄ formulaire
  // --------------------------------------------------------------------------

  function selectedValues(select) {
    return select ? Array.from(select.selectedOptions).map(option => option.value) : [];
  }

  function checkedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
      .map(input => input.value);
  }

  function readForm() {
    const state = FILTERS.filters;
    state.country = dom['country-select'].value;
    state.radiusKm = parseInt(dom['radius-select'].value, 10);
    state.onlyLocated = dom['only-located'].checked;
    state.sortBy = dom['sort-select'].value;
    state.matchMode = dom['match-mode'].value;
    state.maxAgeDays = parseInt(dom['max-age-select'].value, 10);
    state.excludePros = dom['exclude-pros'].checked;
    state.gender = selectedValues(dom['gender-select']);
    state.role = selectedValues(dom['role-select']);

    const free = dom['free-keywords'].value
      .split(',')
      .map(word => word.trim())
      .filter(Boolean);
    state.keywords = [...new Set([...checkedValues('keyword'), ...free])];

    let ageMin = parseInt(dom['age-min'].value, 10);
    let ageMax = parseInt(dom['age-max'].value, 10);
    if (ageMin > ageMax) [ageMin, ageMax] = [ageMax, ageMin];
    state.ageMin = ageMin;
    state.ageMax = ageMax;
    dom['age-min-value'].textContent = String(ageMin);
    dom['age-max-value'].textContent = String(ageMax);

    const sources = checkedValues('source');
    for (const source of SEARCH.allSources()) {
      state.sources[source.id] = sources.includes(source.id);
    }
    return state;
  }

  function writeForm(state) {
    dom['country-select'].value = state.country;
    dom['radius-select'].value = String(state.radiusKm);
    dom['only-located'].checked = state.onlyLocated;
    dom['sort-select'].value = state.sortBy;
    dom['match-mode'].value = state.matchMode;
    dom['max-age-select'].value = String(state.maxAgeDays);
    dom['exclude-pros'].checked = state.excludePros;
    dom['age-min'].value = String(state.ageMin);
    dom['age-max'].value = String(state.ageMax);

    for (const option of dom['gender-select'].options) {
      option.selected = state.gender.includes(option.value);
    }
    for (const option of dom['role-select'].options) {
      option.selected = state.role.includes(option.value);
    }

    const presets = new Set();
    for (const input of document.querySelectorAll('input[name="keyword"]')) {
      input.checked = state.keywords.includes(input.value);
      if (input.checked) presets.add(input.value);
    }
    dom['free-keywords'].value = state.keywords.filter(word => !presets.has(word)).join(', ');

    for (const input of document.querySelectorAll('input[name="source"]')) {
      input.checked = state.sources[input.value] !== false;
    }
    readForm();
  }

  // --------------------------------------------------------------------------
  // Position
  // --------------------------------------------------------------------------

  function refreshPositionLabel() {
    const position = GEO.getPosition();
    if (!GEO.hasPosition()) {
      dom['position-label'].textContent = 'Aucune position définie';
      dom['position-label'].classList.remove('active');
    } else {
      const coords = `${position.lat.toFixed(3)}, ${position.lon.toFixed(3)}`;
      dom['position-label'].textContent = `${position.label} (${coords})`;
      dom['position-label'].classList.add('active');
    }
    dom['search-button'].disabled = !GEO.hasPosition() || searching;
  }

  async function useGps() {
    try {
      showNotification('Demande de la position…', 'info');
      await GEO.requestGps();
      refreshPositionLabel();
      showNotification('Position GPS obtenue.', 'success');
      const city = await GEO.reverse(GEO.getPosition().lat, GEO.getPosition().lon);
      if (city) {
        dom['city-input'].value = city;
        const position = GEO.getPosition();
        dom['position-label'].textContent =
          `${city} (${position.lat.toFixed(3)}, ${position.lon.toFixed(3)})`;
      }
    } catch (error) {
      showNotification(error.message, 'error');
      dom['city-input'].focus();
    }
  }

  async function useCity() {
    const city = dom['city-input'].value.trim();
    if (!city) {
      GEO.clearPosition();
      refreshPositionLabel();
      return;
    }
    try {
      await GEO.setCity(city, dom['country-select'].value);
      refreshPositionLabel();
      showNotification(`Position : ${GEO.getPosition().label}`, 'success');
    } catch (error) {
      showNotification(error.message, 'error');
      refreshPositionLabel();
    }
  }

  // --------------------------------------------------------------------------
  // Recherche
  // --------------------------------------------------------------------------

  function showLoading(message) {
    dom['results'].replaceChildren();
    const loading = RENDER.el('div', 'loading');
    loading.appendChild(RENDER.el('div', 'spinner'));
    loading.appendChild(RENDER.el('p', null, message));
    dom['results'].appendChild(loading);
  }

  async function runSearch() {
    if (searching) return;
    if (!GEO.hasPosition()) {
      showNotification('Définis d’abord une position ou une ville.', 'error');
      return;
    }

    searching = true;
    dom['search-button'].disabled = true;
    showLoading('Interrogation des sources…');

    const state = readForm();
    try {
      const outcome = await SEARCH.run(state, progress => showLoading(progress.message));

      RENDER.renderResults(outcome.results, dom['results'], {
        onFavoriteChange: () => FAVORITES.render(dom['favorites'], dom['favorites-count'])
      });
      dom['result-count'].textContent = String(outcome.results.length);
      RENDER.renderDiagnostics(outcome.reports, outcome.stats, dom['diagnostics']);
      RENDER.renderExternal(outcome.external, dom['external-links']);

      HISTORY.add(state, outcome.results.length, GEO.getPosition().label);
      HISTORY.render(dom['history'], restoreState);

      const failed = outcome.reports.filter(report => !report.ok);
      if (outcome.results.length) {
        showNotification(`${outcome.results.length} annonce(s) trouvée(s).`, 'success');
      } else if (failed.length === outcome.reports.length) {
        showNotification('Toutes les sources ont échoué — voir « État des sources ».', 'error');
      } else {
        showNotification('Aucune annonce ne passe les filtres — voir le détail.', 'warning');
      }
      if (failed.length && failed.length < outcome.reports.length) {
        showNotification(`${failed.length} source(s) en échec.`, 'warning');
      }
    } catch (error) {
      dom['results'].replaceChildren(
        RENDER.el('p', 'no-results', `Erreur pendant la recherche : ${error.message}`)
      );
      showNotification('La recherche a échoué.', 'error');
    } finally {
      searching = false;
      refreshPositionLabel();
    }
  }

  function restoreState(state) {
    Object.assign(FILTERS.filters, state);
    writeForm(FILTERS.filters);
    showNotification('Filtres restaurés. Relance la recherche.', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --------------------------------------------------------------------------
  // Divers
  // --------------------------------------------------------------------------

  function clearResults() {
    dom['results'].replaceChildren(
      RENDER.el('p', 'no-results', 'Résultats effacés.')
    );
    dom['result-count'].textContent = '0';
    dom['diagnostics'].replaceChildren();
  }

  function clearAllData() {
    if (!confirm('Effacer l’historique, les favoris et le cache de localisation ?')) return;
    FAVORITES.clear();
    HISTORY.clear();
    localStorage.removeItem(CONFIG.geocoding.cacheKey);
    FAVORITES.render(dom['favorites'], dom['favorites-count']);
    HISTORY.render(dom['history'], restoreState);
    showNotification('Données locales effacées.', 'success');
  }

  function setupModal() {
    const modal = dom['profile-modal'];
    if (!modal) return;
    modal.querySelector('.close-modal').addEventListener('click', RENDER.closeModal);
    modal.addEventListener('click', event => {
      if (event.target === modal) RENDER.closeModal();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') RENDER.closeModal();
    });
  }

  function setupCollapsibles() {
    for (const panel of document.querySelectorAll('.panel.collapsible')) {
      const heading = panel.querySelector('h2');
      panel.classList.add('collapsed');
      heading.addEventListener('click', () => panel.classList.toggle('collapsed'));
    }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    navigator.serviceWorker.register('service-worker.js').catch(error => {
      console.warn('Service worker non enregistré :', error);
    });
  }

  function init() {
    cacheDom();

    dom['use-gps'].addEventListener('click', useGps);
    dom['city-input'].addEventListener('change', useCity);
    dom['country-select'].addEventListener('change', () => {
      if (dom['city-input'].value.trim()) useCity();
    });
    dom['search-button'].addEventListener('click', runSearch);
    dom['clear-results'].addEventListener('click', clearResults);
    dom['clear-all-data'].addEventListener('click', clearAllData);

    for (const input of document.querySelectorAll('#panel-filters input, #panel-filters select, #panel-sources input, #only-located')) {
      input.addEventListener('change', readForm);
    }
    dom['age-min'].addEventListener('input', readForm);
    dom['age-max'].addEventListener('input', readForm);

    setupModal();
    setupCollapsibles();
    readForm();
    refreshPositionLabel();
    FAVORITES.render(dom['favorites'], dom['favorites-count']);
    HISTORY.render(dom['history'], restoreState);
    RENDER.renderExternal(
      SEARCH.buildExternalSearches(FILTERS.filters, null),
      dom['external-links']
    );
    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
