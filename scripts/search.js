// Orchestrateur de recherche de L'Antre.
//
// Chaîne complète : sources publiques → dédoublonnage → localisation réelle →
// calcul de distance → filtrage → tri. Chaque source rend compte de son état ;
// aucune donnée n'est fabriquée quand une source échoue.

const SEARCH = (() => {
  function allSources() {
    return [SOURCE_REDDIT, SOURCE_BLUESKY, SOURCE_LEMMY, SOURCE_MASTODON];
  }

  function enabledSources(state) {
    return allSources().filter(source => {
      const configured = CONFIG[source.id];
      return configured && configured.enabled !== false && state.sources[source.id] !== false;
    });
  }

  /**
   * Liens de recherche vers les plateformes qui exigent un compte : on n'y
   * scrape rien, on ouvre la recherche réelle avec les critères pré-remplis.
   */
  function buildExternalSearches(state, placeLabel) {
    const terms = [placeLabel, ...state.keywords.slice(0, 3)].filter(Boolean).join(' ');
    const encoded = encodeURIComponent(terms || 'rencontre');
    return [
      {
        name: 'FetLife (via Google)',
        url: `https://www.google.com/search?q=site%3Afetlife.com+${encoded}`
      },
      {
        name: 'FetLife (via DuckDuckGo)',
        url: `https://duckduckgo.com/?q=site%3Afetlife.com+${encoded}`
      },
      {
        name: 'Reddit — recherche complète',
        url: `https://www.reddit.com/r/${CONFIG.reddit.subreddits.join('+')}/search/?q=${encoded}&restrict_sr=1&sort=new`
      },
      {
        name: 'Petites annonces (via DuckDuckGo)',
        url: `https://duckduckgo.com/?q=${encoded}+annonce+rencontre`
      }
    ];
  }

  /**
   * Lance la recherche complète.
   * @param {object} state  filtres courants (FILTERS.filters)
   * @param {function} onProgress  appelé à chaque étape pour l'UI
   */
  async function run(state, onProgress = () => {}) {
    const position = GEO.getPosition();
    const placeLabel = position.label && position.source === 'ville' ? position.label : null;
    const query = FILTERS.buildQuery(state, placeLabel);
    const context = { query, placeLabel, state };

    const sources = enabledSources(state);
    if (!sources.length) {
      return {
        results: [],
        reports: [],
        stats: { fetched: 0, deduped: 0, located: 0, kept: 0, rejections: {} },
        query,
        external: buildExternalSearches(state, placeLabel)
      };
    }

    onProgress({ phase: 'sources', message: `Interrogation de ${sources.length} source(s)…` });

    const settled = await Promise.allSettled(sources.map(source => source.search(context)));
    const reports = settled.map((outcome, index) =>
      outcome.status === 'fulfilled'
        ? outcome.value
        : SOURCE_BASE.report(sources[index].id, sources[index].label, [], outcome.reason, [])
    );

    const fetched = reports.flatMap(report => report.results);
    onProgress({ phase: 'dedupe', message: `${fetched.length} annonce(s) reçue(s), dédoublonnage…` });

    const deduped = UTIL.dedupeResults(fetched);

    // Localisation : d'abord la table embarquée (gratuite), puis Nominatim dans
    // la limite du budget, uniquement pour les annonces encore non localisées.
    onProgress({ phase: 'geo', message: `Localisation de ${deduped.length} annonce(s)…` });
    const budget = { left: CONFIG.geocoding.maxLookupsPerSearch };
    const unlocated = [];
    for (const result of deduped) {
      const found = await GEO.locateResult(result, {
        allowOnline: false,
        countryCode: state.country
      });
      if (!found) unlocated.push(result);
    }
    if (GEO.hasPosition()) {
      for (const result of unlocated) {
        if (budget.left <= 0) break;
        await GEO.locateResult(result, {
          allowOnline: true,
          budget,
          countryCode: state.country
        });
      }
    }

    GEO.applyDistances(deduped);
    const located = deduped.filter(result => result.place).length;

    onProgress({ phase: 'filter', message: 'Application des filtres…' });
    const { kept, rejections } = FILTERS.apply(deduped, state);
    const sorted = FILTERS.sort(kept, state.sortBy).slice(0, CONFIG.maxResults);

    return {
      results: sorted,
      reports,
      stats: {
        fetched: fetched.length,
        deduped: deduped.length,
        located,
        kept: kept.length,
        rejections
      },
      query,
      external: buildExternalSearches(state, placeLabel)
    };
  }

  return { run, allSources, enabledSources, buildExternalSearches };
})();

if (typeof window !== 'undefined') window.SEARCH = SEARCH;
