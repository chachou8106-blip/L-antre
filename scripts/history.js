// Historique des recherches — local au navigateur, rechargeable en un clic.

const HISTORY = (() => {
  const STORAGE_KEY = 'lAntreHistory';
  const MAX_ENTRIES = 25;

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function save(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    } catch (error) {
      /* quota plein : l'historique n'est pas critique */
    }
  }

  /** Enregistre un instantané des filtres et du nombre de résultats. */
  function add(state, resultCount, placeLabel) {
    const entries = load();
    entries.unshift({
      at: new Date().toISOString(),
      resultCount,
      placeLabel: placeLabel || null,
      state: JSON.parse(JSON.stringify(state))
    });
    save(entries);
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function describe(entry) {
    const parts = [];
    if (entry.placeLabel) parts.push(entry.placeLabel);
    parts.push(`${entry.state.radiusKm} km`);
    if (entry.state.keywords.length) parts.push(entry.state.keywords.join(', '));
    if (entry.state.gender.length) parts.push(entry.state.gender.join('/'));
    if (entry.state.role.length) parts.push(entry.state.role.join('/'));
    return parts.join(' · ');
  }

  /** Affiche l'historique ; `onRestore` reçoit l'état de filtres sauvegardé. */
  function render(container, onRestore) {
    const entries = load();
    container.replaceChildren();

    if (!entries.length) {
      container.appendChild(RENDER.el('p', 'no-results', 'Aucune recherche enregistrée.'));
      return;
    }

    for (const entry of entries) {
      const row = RENDER.el('div', 'saved-item');

      const info = RENDER.el('div', 'saved-info');
      info.appendChild(RENDER.el('strong', null, describe(entry) || 'Recherche'));
      const when = UTIL.relativeTime(entry.at) || '';
      info.appendChild(RENDER.el('p', null, `${entry.resultCount} résultat(s) · ${when}`));
      row.appendChild(info);

      const actions = RENDER.el('div', 'saved-actions');
      const restore = RENDER.el('button', 'btn btn-secondary', 'Relancer');
      restore.type = 'button';
      restore.addEventListener('click', () => onRestore(entry.state));
      actions.appendChild(restore);
      row.appendChild(actions);

      container.appendChild(row);
    }
  }

  return { load, add, clear, render, describe };
})();

if (typeof window !== 'undefined') window.HISTORY = HISTORY;
