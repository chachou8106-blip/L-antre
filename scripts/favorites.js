// Favoris de L'Antre — stockés uniquement dans le navigateur (localStorage).
// Rien ne part sur un serveur, il n'y a ni compte ni synchronisation.

const FAVORITES = (() => {
  const STORAGE_KEY = 'lAntreFavorites';

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function save(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch (error) {
      showNotification('Stockage plein : favori non enregistré.', 'error');
      return false;
    }
  }

  function keyOf(result) {
    return result.url || result.id;
  }

  function has(result) {
    const key = keyOf(result);
    return load().some(item => (item.url || item.id) === key);
  }

  /** Ajoute ou retire un favori. Renvoie true si le favori est désormais actif. */
  function toggle(result) {
    const key = keyOf(result);
    const items = load();
    const index = items.findIndex(item => (item.url || item.id) === key);

    if (index >= 0) {
      items.splice(index, 1);
      save(items);
      showNotification('Retiré des favoris.', 'info');
      return false;
    }

    items.unshift({
      id: result.id,
      source: result.source,
      sourceLabel: result.sourceLabel,
      author: result.author,
      authorUrl: result.authorUrl,
      title: result.title,
      text: result.text,
      url: result.url,
      image: result.image,
      createdAt: result.createdAt,
      place: result.place,
      distanceKm: result.distanceKm,
      meta: result.meta,
      savedAt: new Date().toISOString()
    });
    save(items);
    showNotification('Ajouté aux favoris.', 'success');
    return true;
  }

  function remove(key) {
    const items = load().filter(item => (item.url || item.id) !== key);
    save(items);
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Rend la liste des favoris dans le conteneur donné. */
  function render(container, countNode) {
    const items = load();
    container.replaceChildren();
    if (countNode) countNode.textContent = String(items.length);

    if (!items.length) {
      container.appendChild(RENDER.el('p', 'no-results', 'Aucun favori pour le moment.'));
      return;
    }

    for (const item of items) {
      const row = RENDER.el('div', 'saved-item');

      const info = RENDER.el('div', 'saved-info');
      info.appendChild(RENDER.el('strong', null, item.author || 'anonyme'));
      info.appendChild(RENDER.el('span', 'source-badge', item.sourceLabel || item.source));
      const excerpt = (item.title || item.text || '').slice(0, 140);
      info.appendChild(RENDER.el('p', null, excerpt));
      if (item.distanceKm != null) {
        info.appendChild(RENDER.el('span', 'chip', `${item.distanceKm} km`));
      }
      row.appendChild(info);

      const actions = RENDER.el('div', 'saved-actions');
      if (item.url) {
        actions.appendChild(RENDER.externalLink(item.url, 'Ouvrir', 'btn btn-secondary'));
      }
      const drop = RENDER.el('button', 'btn btn-ghost', 'Retirer');
      drop.type = 'button';
      drop.addEventListener('click', () => {
        remove(item.url || item.id);
        render(container, countNode);
      });
      actions.appendChild(drop);
      row.appendChild(actions);

      container.appendChild(row);
    }
  }

  return { load, has, toggle, remove, clear, render };
})();

if (typeof window !== 'undefined') window.FAVORITES = FAVORITES;
