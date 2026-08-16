// Rendu de l'interface de L'Antre.
//
// Règle absolue de ce fichier : aucune donnée provenant d'une source externe
// n'est injectée via innerHTML. Tout passe par textContent / createElement,
// ce qui rend impossible l'exécution de code contenu dans une annonce.

const RENDER = (() => {
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function icon(name) {
    const node = document.createElement('i');
    node.className = `fas fa-${name}`;
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function metaChip(iconName, label) {
    const chip = el('span', 'chip');
    chip.appendChild(icon(iconName));
    chip.appendChild(document.createTextNode(` ${label}`));
    return chip;
  }

  function externalLink(url, label, className) {
    const link = el('a', className, label);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer nofollow';
    return link;
  }

  // --------------------------------------------------------------------------
  // Carte de résultat
  // --------------------------------------------------------------------------

  function distanceLabel(result) {
    if (result.distanceKm == null) return 'Lieu non identifié';
    const place = result.place ? result.place.name : 'lieu approché';
    return `${result.distanceKm} km · ${place}`;
  }

  function buildCard(result, handlers) {
    const card = el('article', 'result-card');
    card.dataset.id = result.id;

    const header = el('div', 'result-header');

    const avatar = el('img', 'result-avatar');
    avatar.src = result.image || 'assets/default-profile.png';
    avatar.alt = '';
    avatar.loading = 'lazy';
    avatar.addEventListener('error', () => {
      avatar.src = 'assets/default-profile.png';
    });
    header.appendChild(avatar);

    const identity = el('div', 'result-identity');
    identity.appendChild(el('h3', null, result.author));
    identity.appendChild(el('span', 'source-badge', result.sourceLabel));
    header.appendChild(identity);

    const favorite = el('button', 'favorite-button');
    favorite.type = 'button';
    favorite.title = 'Ajouter aux favoris';
    favorite.setAttribute('aria-label', 'Ajouter aux favoris');
    favorite.appendChild(icon('heart'));
    if (FAVORITES.has(result)) favorite.classList.add('favorited');
    favorite.addEventListener('click', event => {
      event.stopPropagation();
      const added = FAVORITES.toggle(result);
      favorite.classList.toggle('favorited', added);
      handlers.onFavoriteChange && handlers.onFavoriteChange();
    });
    header.appendChild(favorite);

    card.appendChild(header);

    if (result.title) card.appendChild(el('h4', 'result-title', result.title));

    const excerpt = result.text.length > 320 ? `${result.text.slice(0, 320)}…` : result.text;
    card.appendChild(el('p', 'result-text', excerpt));

    const meta = el('div', 'result-meta');
    meta.appendChild(metaChip('map-marker-alt', distanceLabel(result)));
    if (result.createdAt) {
      const relative = UTIL.relativeTime(result.createdAt);
      if (relative) meta.appendChild(metaChip('clock', relative));
    }
    if (result.meta.age) meta.appendChild(metaChip('birthday-cake', `${result.meta.age} ans`));
    if (result.meta.gender) meta.appendChild(metaChip('venus-mars', result.meta.gender));
    if (result.meta.seeking) meta.appendChild(metaChip('search', `cherche ${result.meta.seeking}`));
    if (result.meta.role) meta.appendChild(metaChip('theater-masks', result.meta.role));
    if (result.nsfw) meta.appendChild(metaChip('exclamation-triangle', 'NSFW'));
    card.appendChild(meta);

    if (result.matchedKeywords.length) {
      const matches = el('div', 'result-matches');
      for (const keyword of result.matchedKeywords) {
        matches.appendChild(el('span', 'keyword-chip', keyword));
      }
      card.appendChild(matches);
    }

    const actions = el('div', 'result-actions');
    if (result.url) {
      actions.appendChild(externalLink(result.url, "Ouvrir l'annonce", 'btn btn-primary'));
    }
    if (result.authorUrl) {
      actions.appendChild(externalLink(result.authorUrl, 'Profil', 'btn btn-secondary'));
    }
    const detail = el('button', 'btn btn-ghost', 'Détails');
    detail.type = 'button';
    detail.addEventListener('click', () => openModal(result));
    actions.appendChild(detail);
    card.appendChild(actions);

    return card;
  }

  function renderResults(results, container, handlers = {}) {
    container.replaceChildren();
    if (!results.length) {
      container.appendChild(
        el('p', 'no-results', 'Aucune annonce ne correspond. Élargis le rayon, réduis les mots-clés ou passe en correspondance souple.')
      );
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const result of results) fragment.appendChild(buildCard(result, handlers));
    container.appendChild(fragment);
  }

  // --------------------------------------------------------------------------
  // Modale de détail
  // --------------------------------------------------------------------------

  function openModal(result) {
    const modal = document.getElementById('profile-modal');
    const body = document.getElementById('modal-body');
    if (!modal || !body) return;

    body.replaceChildren();

    const image = el('img', 'modal-image');
    image.src = result.image || 'assets/default-profile.png';
    image.alt = '';
    image.addEventListener('error', () => {
      image.src = 'assets/default-profile.png';
    });
    body.appendChild(image);

    body.appendChild(el('h2', null, result.author));
    body.appendChild(el('p', 'source-badge', result.sourceLabel));
    if (result.title) body.appendChild(el('h3', null, result.title));
    body.appendChild(el('p', 'modal-text', result.text || 'Pas de texte.'));

    const rows = [
      ['Distance', distanceLabel(result)],
      ['Publié', result.createdAt ? new Date(result.createdAt).toLocaleString('fr-FR') : 'Inconnu'],
      ['Âge annoncé', result.meta.age ? `${result.meta.age} ans` : 'Non précisé'],
      ['Genre déduit', result.meta.gender || 'Non précisé'],
      ['Recherche', result.meta.seeking || 'Non précisé'],
      ['Rôle déduit', result.meta.role || 'Non précisé']
    ];
    const list = el('dl', 'modal-details');
    for (const [label, value] of rows) {
      list.appendChild(el('dt', null, label));
      list.appendChild(el('dd', null, value));
    }
    body.appendChild(list);

    const actions = el('div', 'modal-actions');
    if (result.url) actions.appendChild(externalLink(result.url, "Ouvrir l'annonce", 'btn btn-primary'));
    if (result.authorUrl) actions.appendChild(externalLink(result.authorUrl, 'Voir le profil', 'btn btn-secondary'));
    body.appendChild(actions);

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  // --------------------------------------------------------------------------
  // Panneau de diagnostic : dit franchement ce que chaque source a renvoyé
  // --------------------------------------------------------------------------

  function renderDiagnostics(reports, stats, container) {
    container.replaceChildren();

    const summary = el('div', 'diag-summary');
    summary.appendChild(el('span', null, `${stats.fetched} reçues`));
    summary.appendChild(el('span', null, `${stats.deduped} uniques`));
    summary.appendChild(el('span', null, `${stats.located} localisées`));
    summary.appendChild(el('span', null, `${stats.kept} retenues`));
    container.appendChild(summary);

    const list = el('ul', 'diag-sources');
    for (const report of reports) {
      const item = el('li', report.ok ? 'diag-ok' : 'diag-error');
      item.appendChild(icon(report.ok ? 'check-circle' : 'times-circle'));
      item.appendChild(
        el('span', 'diag-name', ` ${report.label} : `)
      );
      item.appendChild(
        el('span', null, report.ok
          ? `${report.results.length} annonce(s)`
          : `échec — ${report.error}`)
      );
      if (report.attempts.length) {
        const detail = report.attempts
          .map(attempt => `${attempt.via} ${attempt.ok ? 'OK' : `KO (${attempt.error})`}`)
          .join(' · ');
        item.appendChild(el('div', 'diag-attempts', detail));
      }
      list.appendChild(item);
    }
    container.appendChild(list);

    const rejections = Object.entries(stats.rejections).sort((a, b) => b[1] - a[1]);
    if (rejections.length) {
      const filtered = el('div', 'diag-rejections');
      filtered.appendChild(el('strong', null, 'Écartées par les filtres : '));
      filtered.appendChild(
        el('span', null, rejections.map(([reason, count]) => `${count} × ${reason}`).join(', '))
      );
      container.appendChild(filtered);
    }
  }

  function renderExternal(links, container) {
    container.replaceChildren();
    for (const link of links) {
      container.appendChild(externalLink(link.url, link.name, 'btn btn-secondary'));
    }
  }

  return {
    el,
    buildCard,
    renderResults,
    renderDiagnostics,
    renderExternal,
    openModal,
    closeModal,
    externalLink
  };
})();

if (typeof window !== 'undefined') window.RENDER = RENDER;
