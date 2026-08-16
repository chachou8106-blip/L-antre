// Sources de recherche de L'Antre — mode agrégateur.
//
// Principe : L'Antre ne contourne pas les protections des sites et n'invente
// aucun profil. Pour chaque source, elle construit un lien de recherche réel,
// prêt à ouvrir. Quand une source expose une API publique consultable depuis un
// navigateur (aujourd'hui : Reddit), les résultats sont récupérés et affichés
// directement. Sinon, seule la carte « lien de recherche » est proposée.

/** Serveur Overpass interrogé pour les lieux réels (données OpenStreetMap). */
const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

/** Libellés lisibles des catégories de lieux OpenStreetMap. */
const PLACE_LABELS = {
  swingerclub: 'Club libertin',
  swinger: 'Club échangiste',
  sauna: 'Sauna',
  erotic: 'Boutique érotique',
  nightclub: 'Club'
};

/**
 * Transforme un élément Overpass en fiche de lieu exploitable.
 * @param {Object} element - Élément renvoyé par Overpass.
 * @param {{lat: number, lng: number}} origin - Point de référence pour la distance.
 * @returns {Object|null}
 */
function buildPlace(element, origin) {
  const tags = element.tags || {};
  const lat = element.lat ?? (element.center && element.center.lat);
  const lng = element.lon ?? (element.center && element.center.lon);
  if (!tags.name && !tags['addr:street']) return null;

  const category = PLACE_LABELS[tags.amenity] || PLACE_LABELS[tags.club]
    || PLACE_LABELS[tags.leisure] || PLACE_LABELS[tags.shop] || 'Lieu';

  const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:postcode'],
    tags['addr:city']].filter(Boolean).join(' ');

  const distance = (lat !== undefined && lng !== undefined && origin)
    ? distanceKm(origin.lat, origin.lng, lat, lng)
    : null;

  const website = tags.website || tags['contact:website'] || tags.url;
  const osmLink = `https://www.openstreetmap.org/${element.type}/${element.id}`;

  return {
    type: 'place',
    id: hashId(`osm:${element.type}:${element.id}`),
    source: 'maps',
    platform: `${category} · OpenStreetMap`,
    icon: 'fas fa-location-dot',
    title: tags.name || category,
    bio: [address, tags.opening_hours ? `Horaires : ${tags.opening_hours}` : '',
      tags.description || ''].filter(Boolean).join(' — ') || 'Adresse relevée dans OpenStreetMap.',
    link: website || osmLink,
    image: null,
    date: null,
    address,
    phone: tags.phone || tags['contact:phone'] || null,
    openingHours: tags.opening_hours || null,
    website: website || null,
    lat,
    lng,
    distance,
    location: distance !== null ? `${distance} km` : (filters.location.city || null),
    gender: null,
    role: null,
    verified: false
  };
}

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

      const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 8000);
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
    name: 'Lieux',
    icon: 'fas fa-map-location-dot',
    note: 'Clubs libertins, saunas et adresses réelles autour de toi.',
    searchUrl() {
      const query = encodeURIComponent(buildPlacesQuery());
      const { lat, lng } = filters.location;
      if (lat !== null && lng !== null) {
        return `https://www.google.com/maps/search/${query}/@${lat},${lng},${radiusToZoom()}z`;
      }
      return `https://www.google.com/maps/search/${query}`;
    },
    async fetchLive() {
      const point = await ensureCoordinates();
      if (!point) throw new Error('Coordonnées inconnues');

      // Rayon plafonné : au-delà, la requête devient trop lourde pour Overpass.
      const radius = Math.min(filters.radius, 100) * 1000;
      const query = `[out:json][timeout:20];(`
        + `nwr["amenity"="swingerclub"](around:${radius},${point.lat},${point.lng});`
        + `nwr["club"="swinger"](around:${radius},${point.lat},${point.lng});`
        + `nwr["leisure"="sauna"](around:${radius},${point.lat},${point.lng});`
        + `nwr["shop"="erotic"](around:${radius},${point.lat},${point.lng});`
        + `nwr["amenity"="nightclub"]["name"~"libertin|echangiste|échangiste|fetish|bdsm|swing",i](around:${radius},${point.lat},${point.lng});`
        + `);out center 60;`;

      const response = await fetchWithTimeout(OVERPASS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      }, 20000);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      return (payload.elements || [])
        .map(element => buildPlace(element, point))
        .filter(Boolean)
        .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
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
 * Trie les résultats selon le critère choisi.
 * Les lieux et les annonces sont classés ensemble ; les cartes « lien de
 * recherche » restent groupées en fin de liste.
 * @param {Object[]} results
 * @returns {Object[]}
 */
function sortResults(results) {
  const found = results.filter(result => result.type !== 'link');
  const links = results.filter(result => result.type === 'link');

  const byDistance = (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity);

  if (filters.sortBy === 'distance') {
    found.sort(byDistance);
  } else if (filters.sortBy === 'source') {
    found.sort((a, b) => String(a.platform).localeCompare(String(b.platform), 'fr'));
  } else if (filters.sortBy === 'recent') {
    found.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  } else {
    // Pertinence : les annonces notées d'abord, puis les lieux par distance.
    found.sort((a, b) => {
      const scoreDiff = (b.score ?? -1) - (a.score ?? -1);
      return scoreDiff !== 0 ? scoreDiff : byDistance(a, b);
    });
  }

  return [...found, ...links];
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

  const liveSources = activeSources.filter(source => typeof source.fetchLive === 'function');

  // Les liens de recherche ne dépendent d'aucun réseau : ils s'affichent tout de
  // suite. Une source en direct lente ou bloquée ne doit jamais retarder — ni
  // faire disparaître — le reste des résultats.
  const linkCards = activeSources.map(source => buildLinkCard(source));
  renderResults(sortResults(dedupeResults([...linkCards])), {
    pendingMessage: liveSources.length
      ? `Interrogation de ${liveSources.map(source => source.name).join(', ')}…`
      : ''
  });

  const posts = [];
  const failed = [];

  if (liveSources.length) {
    try {
      const settled = await Promise.allSettled(liveSources.map(source => source.fetchLive()));

      settled.forEach((outcome, index) => {
        const source = liveSources[index];
        if (outcome.status === 'fulfilled') {
          const raw = outcome.value || [];
          // Exclusions dures d'abord (pros, âge, ancienneté), puis notation.
          const kept = rankResults(raw.filter(matchesFilters));
          posts.push(...kept);
          showNotification(`${source.name} : ${kept.length} résultat(s) sur ${raw.length}.`,
            kept.length ? 'success' : 'info');
        } else {
          failed.push(source.id);
          console.warn(`Source ${source.id} indisponible :`, outcome.reason);
          showNotification(`${source.name} injoignable — le lien de recherche reste utilisable.`, 'warning');
        }
      });
    } catch (error) {
      // Filet de sécurité : même un imprévu ici ne doit pas vider la liste.
      console.error('Phase de récupération interrompue :', error);
      showNotification('Récupération directe interrompue — les liens restent disponibles.', 'warning');
    }
  }

  let finalResults = dedupeResults([
    ...posts,
    ...activeSources.map(source =>
      buildLinkCard(source, failed.includes(source.id) ? '(récupération directe indisponible)' : ''))
  ]);

  if (filters.vision.enabled && posts.length) {
    try {
      finalResults = await analyzeResultImages(finalResults);
    } catch (error) {
      console.warn('Analyse d\'image ignorée :', error);
    }
  }

  finalResults = sortResults(finalResults);

  renderResults(finalResults);
  saveToHistory(filters, posts.length);

  return finalResults;
}

window.SOURCES = SOURCES;
window.searchAll = searchAll;
window.sortResults = sortResults;
window.dedupeResults = dedupeResults;
window.buildLinkCard = buildLinkCard;
window.inferGender = inferGender;
window.inferRole = inferRole;
