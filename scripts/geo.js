// Géolocalisation et résolution de lieux pour L'Antre.
//
// Deux niveaux :
//   1. table locale (cities.js) — instantané, hors ligne, couvre l'essentiel ;
//   2. Nominatim/OpenStreetMap — pour tout le reste, sans clé API, avec cache
//      permanent et file d'attente respectant la limite de 1 requête/seconde.

const GEO = (() => {
  const cityIndex = new Map();
  let geoCache = {};
  let lastLookupAt = 0;
  let lookupChain = Promise.resolve();

  const state = {
    lat: null,
    lon: null,
    label: null,
    source: null // 'gps' | 'ville'
  };

  // -------------------------------------------------------------------------
  // Index local
  // -------------------------------------------------------------------------

  function cityKey(name) {
    return UTIL.normalizeText(name)
      .replace(/^st[\s-]/, 'saint-')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function buildIndex() {
    if (cityIndex.size) return;
    for (const [name, lat, lon] of CITIES) {
      cityIndex.set(cityKey(name), { name, lat, lon });
    }
    // Les chefs-lieux référencés par les départements sans être dans CITIES
    // resteront résolus en ligne ; l'index ne contient que ce qu'on connaît.
  }

  /** Cherche un lieu dans la table embarquée. */
  function lookupLocal(query) {
    buildIndex();
    const key = cityKey(query);
    if (!key) return null;
    if (cityIndex.has(key)) return { ...cityIndex.get(key), precision: 'ville' };

    const alias = REGION_ALIASES[key];
    if (alias && cityIndex.has(cityKey(alias))) {
      return { ...cityIndex.get(cityKey(alias)), name: query, precision: 'region' };
    }

    const dept = key.match(/^(\d{2})$/);
    if (dept && DEPARTMENTS[dept[1]]) {
      const chef = cityIndex.get(cityKey(DEPARTMENTS[dept[1]]));
      if (chef) {
        return { ...chef, name: `Dépt ${dept[1]}`, precision: 'departement' };
      }
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Cache persistant
  // -------------------------------------------------------------------------

  function loadCache() {
    try {
      geoCache = JSON.parse(localStorage.getItem(CONFIG.geocoding.cacheKey)) || {};
    } catch (error) {
      geoCache = {};
    }
  }

  function saveCache() {
    try {
      localStorage.setItem(CONFIG.geocoding.cacheKey, JSON.stringify(geoCache));
    } catch (error) {
      /* quota plein : on continue sans cache */
    }
  }

  // -------------------------------------------------------------------------
  // Nominatim
  // -------------------------------------------------------------------------

  /** Sérialise les appels et respecte l'intervalle minimum imposé par OSM. */
  function throttle(task) {
    lookupChain = lookupChain.then(async () => {
      const wait = CONFIG.geocoding.minIntervalMs - (Date.now() - lastLookupAt);
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
      lastLookupAt = Date.now();
      return task();
    }).catch(() => null);
    return lookupChain;
  }

  /**
   * Géocode une chaîne libre. Renvoie null si le lieu est introuvable.
   * Le résultat (y compris négatif) est mis en cache définitivement.
   */
  async function geocode(query, countryCode) {
    if (!query) return null;
    const local = lookupLocal(query);
    if (local) return local;

    loadCache();
    const cacheKey = `${cityKey(query)}|${countryCode || ''}`;
    if (Object.prototype.hasOwnProperty.call(geoCache, cacheKey)) {
      return geoCache[cacheKey];
    }

    const result = await throttle(async () => {
      const url = new URL(CONFIG.geocoding.endpoint);
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('limit', '1');
      url.searchParams.set('addressdetails', '0');
      if (countryCode) url.searchParams.set('countrycodes', countryCode);
      const data = await UTIL.fetchJson(
        url.toString(),
        { headers: { Accept: 'application/json' } },
        CONFIG.requestTimeoutMs
      );
      if (!Array.isArray(data) || !data.length) return null;
      const hit = data[0];
      return {
        name: hit.display_name.split(',')[0],
        lat: parseFloat(hit.lat),
        lon: parseFloat(hit.lon),
        precision: 'nominatim'
      };
    });

    geoCache[cacheKey] = result;
    saveCache();
    return result;
  }

  /** Retrouve le nom de la commune à partir de coordonnées GPS. */
  async function reverse(lat, lon) {
    return throttle(async () => {
      const url = new URL(CONFIG.geocoding.reverseEndpoint);
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lon));
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('zoom', '10');
      const data = await UTIL.fetchJson(
        url.toString(),
        { headers: { Accept: 'application/json' } },
        CONFIG.requestTimeoutMs
      );
      const address = data && data.address;
      if (!address) return null;
      return address.city || address.town || address.village || address.municipality ||
             address.county || address.state || null;
    });
  }

  // -------------------------------------------------------------------------
  // Extraction de lieux dans le texte d'une annonce
  // -------------------------------------------------------------------------

  // Les codes de type « 25M4F », « M4F », « 30F » ne sont pas des lieux.
  const CODE_PATTERN = /^\s*\d{0,3}\s*[mfhtc]{1,3}\s*4\s*[mfhtcra]{1,3}\s*\d{0,3}\s*$/i;
  const AGE_ONLY_PATTERN = /^\s*\d{1,3}\s*(ans|yo|y\/o|m|f|h)?\s*$/i;

  /**
   * Renvoie une liste ordonnée de lieux plausibles pour une annonce.
   * Les crochets (convention r4r « [Paris] ») priment sur le corps du texte.
   */
  function extractPlaceCandidates(text) {
    buildIndex();
    const candidates = [];
    const push = value => {
      const clean = String(value || '').trim();
      if (!clean || clean.length > 60) return;
      if (CODE_PATTERN.test(clean) || AGE_ONLY_PATTERN.test(clean)) return;
      if (!candidates.some(c => cityKey(c) === cityKey(clean))) candidates.push(clean);
    };

    const raw = String(text || '');

    // 1. Contenu des crochets et parenthèses.
    for (const match of raw.matchAll(/[[(]([^\])]{2,60})[\])]/g)) {
      push(match[1]);
    }

    // 2. Numéro de département annoncé explicitement.
    for (const match of raw.matchAll(/\b(?:d(?:e|é)pt?|dep|dpt)\.?\s*:?\s*(\d{2})\b/gi)) {
      push(match[1]);
    }

    // 3. Noms de villes connus repérés dans le corps du texte.
    const normalized = ` ${UTIL.normalizeText(raw).replace(/[^a-z0-9]+/g, ' ')} `;
    for (const [key, city] of cityIndex) {
      if (key.length < 4) continue;
      if (normalized.includes(` ${key} `)) push(city.name);
    }

    // 4. Expressions régionales (« IDF », « région parisienne »…).
    for (const alias of Object.keys(REGION_ALIASES)) {
      if (normalized.includes(` ${alias} `)) push(alias);
    }

    return candidates;
  }

  /**
   * Localise une annonce : d'abord via la table locale (gratuit, instantané),
   * puis via Nominatim si `allowOnline` et que le quota n'est pas épuisé.
   * Mute le résultat et renvoie true si un lieu a été trouvé.
   */
  async function locateResult(result, options = {}) {
    const { allowOnline = false, budget = { left: 0 }, countryCode = null } = options;
    const candidates = extractPlaceCandidates(
      [result.title, result.text, result.rawLocation].filter(Boolean).join(' ')
    );

    for (const candidate of candidates) {
      const local = lookupLocal(candidate);
      if (local) {
        result.place = local;
        return true;
      }
    }

    if (allowOnline) {
      for (const candidate of candidates) {
        if (budget.left <= 0) break;
        budget.left -= 1;
        const found = await geocode(candidate, countryCode);
        if (found) {
          result.place = found;
          return true;
        }
      }
    }
    return false;
  }

  /** Calcule la distance de chaque résultat à la position de l'utilisateur. */
  function applyDistances(results) {
    for (const result of results) {
      result.distanceKm = result.place
        ? UTIL.haversineKm(state.lat, state.lon, result.place.lat, result.place.lon)
        : null;
    }
    return results;
  }

  // -------------------------------------------------------------------------
  // Position de l'utilisateur
  // -------------------------------------------------------------------------

  /** Demande la position GPS du navigateur. */
  function requestGps() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("La géolocalisation n'est pas supportée par ce navigateur."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        position => {
          state.lat = position.coords.latitude;
          state.lon = position.coords.longitude;
          state.source = 'gps';
          state.label = 'Position GPS';
          resolve({ ...state });
        },
        error => {
          const messages = {
            1: 'Géolocalisation refusée. Saisis une ville à la place.',
            2: 'Position indisponible. Saisis une ville à la place.',
            3: 'La géolocalisation a expiré. Réessaie ou saisis une ville.'
          };
          reject(new Error(messages[error.code] || 'Position introuvable.'));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  /** Définit la position à partir d'un nom de ville saisi à la main. */
  async function setCity(city, countryCode) {
    const found = await geocode(city, countryCode);
    if (!found) throw new Error(`Ville introuvable : ${city}`);
    state.lat = found.lat;
    state.lon = found.lon;
    state.source = 'ville';
    state.label = found.name;
    return { ...state };
  }

  function getPosition() {
    return { ...state };
  }

  function hasPosition() {
    return typeof state.lat === 'number' && typeof state.lon === 'number';
  }

  function clearPosition() {
    state.lat = null;
    state.lon = null;
    state.label = null;
    state.source = null;
  }

  return {
    lookupLocal,
    geocode,
    reverse,
    extractPlaceCandidates,
    locateResult,
    applyDistances,
    requestGps,
    setCity,
    getPosition,
    hasPosition,
    clearPosition
  };
})();

if (typeof window !== 'undefined') window.GEO = GEO;
