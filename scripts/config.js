// Configuration de L'Antre
// Toutes les sources listées ici sont des APIs PUBLIQUES, sans compte ni clé.
// Tu peux éditer ce fichier pour ajouter/retirer des subreddits, des instances
// ou des mots-clés : rien d'autre n'a besoin d'être modifié.

const CONFIG = {
  // ---------------------------------------------------------------
  // Reddit — endpoint .json public (pas d'OAuth, pas de compte)
  // ---------------------------------------------------------------
  reddit: {
    enabled: true,
    // Subreddits interrogés en multireddit. Un sub inexistant renvoie
    // simplement zéro résultat, il ne casse pas la recherche.
    subreddits: [
      'r4r',
      'dirtyr4r',
      'r4r30plus',
      'BDSMpersonals',
      'ForeverAloneDating'
    ],
    limit: 100,
    // Reddit bloque parfois les requêtes navigateur depuis une origine tierce.
    // On tente en direct, puis via ces relais publics, dans l'ordre.
    corsProxies: [
      'https://api.allorigins.win/raw?url=',
      'https://api.codetabs.com/v1/proxy?quest='
    ]
  },

  // ---------------------------------------------------------------
  // Bluesky — API publique AppView, sans authentification
  // https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts
  // ---------------------------------------------------------------
  bluesky: {
    enabled: true,
    endpoint: 'https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts',
    limit: 100
  },

  // ---------------------------------------------------------------
  // Lemmy — API v3 publique des instances fédérées
  // ---------------------------------------------------------------
  lemmy: {
    enabled: true,
    instances: [
      'https://lemmy.world',
      'https://lemmynsfw.com'
    ],
    limit: 50
  },

  // ---------------------------------------------------------------
  // Mastodon — timelines de hashtags publiques (pas de compte requis)
  // ---------------------------------------------------------------
  mastodon: {
    enabled: true,
    instances: [
      'https://mastodon.social',
      'https://piaille.fr'
    ],
    // Hashtags balayés ; les filtres s'appliquent ensuite au texte.
    tags: ['r4r', 'bdsm', 'libertinage', 'rencontre'],
    limit: 40
  },

  // ---------------------------------------------------------------
  // Géocodage — Nominatim (OpenStreetMap), public et sans clé.
  // Politique d'usage : 1 requête/seconde maximum. On respecte ça via
  // une file d'attente + un cache localStorage permanent.
  // ---------------------------------------------------------------
  geocoding: {
    endpoint: 'https://nominatim.openstreetmap.org/search',
    reverseEndpoint: 'https://nominatim.openstreetmap.org/reverse',
    minIntervalMs: 1100,
    cacheKey: 'lAntreGeoCache',
    // Nombre max de lieux inconnus géocodés en ligne par recherche.
    maxLookupsPerSearch: 12
  },

  // Délai maximum accordé à une source avant abandon.
  requestTimeoutMs: 15000,

  // Nombre de résultats affichés au maximum.
  maxResults: 300
};

if (typeof window !== 'undefined') window.CONFIG = CONFIG;
if (typeof module !== 'undefined') module.exports = { CONFIG };
