// Socle commun aux connecteurs de sources.
// Chaque connecteur renvoie un rapport uniforme :
//   { id, label, ok, results, error, attempts }
// Un connecteur qui échoue le dit — il ne fabrique jamais de résultat.

const SOURCE_BASE = (() => {
  /**
   * Normalise une annonce brute en objet exploitable par le reste de l'app.
   * `url` et `authorUrl` sont assainis : seuls http/https passent.
   */
  function makeResult(input) {
    const text = (input.text || '').trim();
    const title = (input.title || '').trim();
    const url = UTIL.safeUrl(input.url);
    const result = {
      id: UTIL.hashString(`${input.source}|${input.url || ''}|${title}|${text.slice(0, 200)}`),
      source: input.source,
      sourceLabel: input.sourceLabel || input.source,
      author: input.author || 'anonyme',
      authorUrl: UTIL.safeUrl(input.authorUrl),
      title,
      text,
      url,
      image: UTIL.safeUrl(input.image),
      createdAt: input.createdAt || null,
      nsfw: Boolean(input.nsfw),
      rawLocation: input.rawLocation || null,
      place: null,
      distanceKm: null,
      matchedKeywords: [],
      score: 0
    };
    result.meta = FILTERS.parseMeta(`${title} ${text}`);
    return result;
  }

  function report(id, label, results, error, attempts) {
    return {
      id,
      label,
      ok: !error,
      results: results || [],
      error: error ? String(error.message || error) : null,
      attempts: attempts || []
    };
  }

  return { makeResult, report };
})();

if (typeof window !== 'undefined') window.SOURCE_BASE = SOURCE_BASE;
