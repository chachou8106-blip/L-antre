// Sources de recherche de L'Antre — mode agrégateur.
//
// Principe : L'Antre ne contourne pas les protections des sites et n'invente
// aucun profil. Pour chaque source, elle construit un lien de recherche réel,
// prêt à ouvrir. Quand une source expose une API publique consultable depuis un
// navigateur (aujourd'hui : Reddit), les résultats sont récupérés et affichés
// directement. Sinon, seule la carte « lien de recherche » est proposée.

/** Subreddits interrogés pour la recherche en direct. */
const REDDIT_SUBS = 'DirtyR4R+BDSMr4r+r4r+bdsmpersonals+Femdom+libertinage';

/** Sites Craigslist par pays, pour construire un lien de recherche local. */
const CRAIGSLIST_SITES = {
  fr: ['paris', 'marseille', 'lyon', 'toulouse', 'nice', 'bordeaux', 'nantes', 'strasbourg'],
  be: ['brussels', 'antwerp'],
  ch: ['geneva', 'zurich', 'lausanne', 'bern'],
  ca: ['montreal', 'quebec', 'toronto', 'ottawa', 'vancouver']
};

/**
 * Choisit le sous-domaine Craigslist le plus proche de la ville saisie.
 * @returns {string}
 */
function craigslistSite() {
  const sites = CRAIGSLIST_SITES[filters.location.country] || CRAIGSLIST_SITES.fr;
  const city = normalizeText(filters.location.city);
  return sites.find(site => city && (city.includes(site) || site.includes(city))) || sites[0];
}

/**
 * Déduit un genre depuis le texte d'une annonce (formats r4r : [25F], F4M…).
 * @param {string} text
 * @returns {string|null}
 */
function inferGender(text) {
  const source = normalizeText(text);
  if (/\bcouple\b|\bc4[mfa]\b/.test(source)) return 'Couple';
  if (/\btrans\b|\bmtf\b|\btgirl\b/.test(source)) return 'Trans (H→F)';
  if (/\bftm\b/.test(source)) return 'Trans (F→H)';
  if (/\bnon[- ]binaire\b|\bnb\b|\benby\b/.test(source)) return 'Non-binaire';
  if (/\bgroupe\b|\bgangbang\b|\bgroup\b/.test(source)) return 'Groupe';
  if (/\[\s*\d{2}\s*f\s*\]|\b\d{2}\s*f\b|\bf4[mfa]\b|\bfemme\b|\bfemale\b/.test(source)) return 'Femme';
  if (/\[\s*\d{2}\s*[mh]\s*\]|\b\d{2}\s*[mh]\b|\b[mh]4[mfa]\b|\bhomme\b|\bmale\b/.test(source)) return 'Homme';
  return null;
}

/** Rôles BDSM reconnus dans le texte d'une annonce. */
const ROLE_TERMS = ['Dominatrice', 'Dominant', 'Soumise', 'Soumis', 'Switch',
  'Amatrice', 'Amateur', 'Maîtresse', 'Esclave'];

/**
 * Déduit un rôle BDSM depuis le texte d'une annonce.
 * @param {string} text
 * @returns {string|null}
 */
function inferRole(text) {
  const found = ROLE_TERMS.find(role => containsTerm(text, role));
  if (found) return found;
  if (containsTerm(text, 'domme') || containsTerm(text, 'domina')) return 'Dominatrice';
  if (containsTerm(text, 'sub') || containsTerm(text, 'submissive')) return 'Soumis';
  return null;
}

/**
 * Récupère la meilleure image disponible pour un post Reddit.
 * @param {Object} post - post.data de l'API Reddit.
 * @returns {string|null}
 */
function redditImage(post) {
  const preview = post.preview && post.preview.images && post.preview.images[0];
  if (preview && preview.source && /^https?:/.test(preview.source.url)) {
    return preview.source.url;
  }
  if (post.thumbnail && /^https?:\/\//.test(post.thumbnail)) return post.thumbnail;
  return null;
}

// =============================================
// Registre des sources
// =============================================
const SOURCES = [
  {
    id: 'reddit',
    name: 'Reddit',
    icon: 'fab fa-reddit-alien',
    note: 'Annonces r4r publiques — résultats récupérés en direct.',
    searchUrl() {
      const query = encodeURIComponent(buildRedditQuery() || locationCityOrEmpty());
      return `https://www.reddit.com/r/${REDDIT_SUBS}/search/?q=${query}&restrict_sr=1&sort=new`;
    },
    async fetchLive() {
      const query = buildRedditQuery() || locationCityOrEmpty();
      const url = `https://www.reddit.com/r/${REDDIT_SUBS}/search.json`
        + `?q=${encodeURIComponent(query)}&restrict_sr=on&sort=new&t=year&limit=25&raw_json=1`;

      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      const children = (payload.data && payload.data.children) || [];

      return children
        .map(child => child.data)
        .filter(post => post && !post.stickied)
        .map(post => {
          const text = `${post.title || ''} ${post.selftext || ''}`.trim();
          return {
            type: 'post',
            id: hashId(post.permalink),
            source: 'reddit',
            platform: `Reddit · r/${post.subreddit}`,
            title: post.title || 'Sans titre',
            username: post.author ? `u/${post.author}` : 'Anonyme',
            bio: (post.selftext || '').slice(0, 600),
            link: `https://www.reddit.com${post.permalink}`,
            image: redditImage(post),
            date: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
            location: filters.location.city || null,
            gender: inferGender(text),
            role: inferRole(text),
            age: extractAge(text),
            verified: false
          };
        });
    }
  },
  {
    id: 'fetlife',
    name: 'FetLife',
    icon: 'fas fa-mask',
    note: 'Recherche FetLife (compte requis) — les CGU interdisent l’extraction automatique.',
    searchUrl() {
      const terms = [...keywordTerms(4), locationCityOrEmpty()].filter(Boolean).join(' ');
      return `https://fetlife.com/search?q=${encodeURIComponent(terms || 'bdsm')}`;
    }
  },
  {
    id: 'maps',
    name: 'Lieux (Google Maps)',
    icon: 'fas fa-map-location-dot',
    note: 'Clubs, saunas et soirées autour du point de recherche.',
    searchUrl() {
      const query = encodeURIComponent(buildPlacesQuery());
      const { lat, lng } = filters.location;
      if (lat !== null && lng !== null) {
        return `https://www.google.com/maps/search/${query}/@${lat},${lng},${radiusToZoom()}z`;
      }
      return `https://www.google.com/maps/search/${query}`;
    }
  },
  {
    id: 'forums',
    name: 'Forums libertins',
    icon: 'fas fa-comments',
    note: 'Recherche ciblée sur les forums et petites annonces francophones.',
    searchUrl() {
      const terms = [...keywordTerms(4), locationCityOrEmpty(), 'forum libertin']
        .filter(Boolean).join(' ');
      return `https://duckduckgo.com/?q=${encodeURIComponent(terms)}`;
    }
  },
  {
    id: 'craigslist',
    name: 'Craigslist',
    icon: 'fas fa-newspaper',
    note: 'Section « activity partners » du site local.',
    searchUrl() {
      const terms = [...keywordTerms(3), locationCityOrEmpty()].filter(Boolean).join(' ');
      return `https://${craigslistSite()}.craigslist.org/search/act?query=${encodeURIComponent(terms)}`;
    }
  },
  {
    id: 'web',
    name: 'Recherche web',
    icon: 'fas fa-globe',
    note: 'Requête générale construite à partir de tes filtres.',
    searchUrl() {
      return `https://duckduckgo.com/?q=${encodeURIComponent(buildWebQuery())}`;
    }
  }
];

/**
 * Ville courante, ou chaîne vide.
 * @returns {string}
 */
function locationCityOrEmpty() {
  return filters.location.city || '';
}

/**
 * Construit la carte « lien de recherche » d'une source.
 * @param {Object} source
 * @param {string} [extraNote]
 * @returns {Object}
 */
function buildLinkCard(source, extraNote) {
  const url = source.searchUrl();
  return {
    type: 'link',
    id: hashId(`${source.id}:${url}`),
    source: source.id,
    platform: source.name,
    icon: source.icon,
    title: `Ouvrir la recherche sur ${source.name}`,
    username: source.name,
    bio: extraNote ? `${source.note} ${extraNote}` : source.note,
    link: url,
    image: null,
    date: null,
    location: filters.location.city || (filters.location.lat !== null ? 'Position GPS' : null),
    gender: null,
    role: null,
    verified: false
  };
}

/**
 * Supprime les doublons (même lien).
 * @param {Object[]} results
 * @returns {Object[]}
 */
function dedupeResults(results) {
  const seen = new Set();
  return results.filter(result => {
    const key = normalizeText(result.link || result.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Score de pertinence : nombre de mots-clés retenus présents dans le texte.
 * @param {Object} result
 * @returns {number}
 */
function relevanceScore(result) {
  const text = `${result.title || ''} ${result.bio || ''}`;
  return keywordTerms(12).reduce((score, term) => score + (containsTerm(text, term) ? 1 : 0), 0);
}

/**
 * Trie les résultats selon le critère choisi.
 * Les cartes « lien » restent groupées en fin de liste.
 * @param {Object[]} results
 * @returns {Object[]}
 */
function sortResults(results) {
  const posts = results.filter(result => result.type !== 'link');
  const links = results.filter(result => result.type === 'link');

  if (filters.sortBy === 'relevance') {
    posts.sort((a, b) => relevanceScore(b) - relevanceScore(a));
  } else if (filters.sortBy === 'source') {
    posts.sort((a, b) => String(a.platform).localeCompare(String(b.platform), 'fr'));
  } else {
    posts.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }

  return [...posts, ...links];
}

/**
 * Lance la recherche sur toutes les sources activées.
 * @returns {Promise<Object[]>}
 */
async function searchAll() {
  updateFilters();

  if (!filters.location.city && filters.location.lat === null) {
    showNotification('Indique une ville ou active la géolocalisation.', 'error');
    return [];
  }

  const activeSources = SOURCES.filter(source => filters.sources.includes(source.id));
  if (!activeSources.length) {
    showNotification('Aucune source sélectionnée.', 'error');
    return [];
  }

  renderLoading(`Recherche sur ${activeSources.length} source(s)…`);

  const liveSources = activeSources.filter(source => typeof source.fetchLive === 'function');
  const settled = await Promise.allSettled(liveSources.map(source => source.fetchLive()));

  const results = [];
  const failed = [];

  settled.forEach((outcome, index) => {
    const source = liveSources[index];
    if (outcome.status === 'fulfilled') {
      const kept = outcome.value.filter(matchesFilters);
      results.push(...kept);
      showNotification(`${source.name} : ${kept.length} annonce(s) sur ${outcome.value.length}.`,
        kept.length ? 'success' : 'info');
    } else {
      failed.push(source.id);
      console.warn(`Source ${source.id} indisponible :`, outcome.reason);
      showNotification(`${source.name} inaccessible depuis le navigateur — lien de recherche fourni.`, 'warning');
    }
  });

  activeSources.forEach(source => {
    const note = failed.includes(source.id) ? '(récupération directe indisponible)' : '';
    results.push(buildLinkCard(source, note));
  });

  let finalResults = dedupeResults(results);

  if (filters.vision.enabled) {
    finalResults = await analyzeResultImages(finalResults);
  }

  finalResults = sortResults(finalResults);

  renderResults(finalResults);
  saveToHistory(filters, finalResults.filter(result => result.type !== 'link').length);

  return finalResults;
}

window.SOURCES = SOURCES;
window.searchAll = searchAll;
window.sortResults = sortResults;
window.dedupeResults = dedupeResults;
window.buildLinkCard = buildLinkCard;
window.inferGender = inferGender;
window.inferRole = inferRole;
