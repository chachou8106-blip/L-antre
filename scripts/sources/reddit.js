// Connecteur Reddit — endpoint .json public, sans compte ni OAuth.
//
// Reddit refuse parfois les requêtes navigateur venant d'une origine tierce.
// On tente donc dans l'ordre : appel direct, puis chaque relais CORS configuré.
// Si tout échoue, la source est signalée en erreur : aucun résultat inventé.

const SOURCE_REDDIT = (() => {
  const ID = 'reddit';
  const LABEL = 'Reddit';

  function buildUrl(query) {
    const subs = CONFIG.reddit.subreddits.join('+');
    const limit = CONFIG.reddit.limit;
    if (query) {
      const params = new URLSearchParams({
        q: query,
        restrict_sr: '1',
        sort: 'new',
        t: 'month',
        limit: String(limit),
        raw_json: '1',
        include_over_18: 'on'
      });
      return `https://www.reddit.com/r/${subs}/search.json?${params}`;
    }
    return `https://www.reddit.com/r/${subs}/new.json?limit=${limit}&raw_json=1`;
  }

  /** Essaie l'URL en direct puis via les relais, et renvoie le premier succès. */
  async function fetchWithFallbacks(targetUrl, attempts) {
    const candidates = [
      { via: 'direct', url: targetUrl },
      ...CONFIG.reddit.corsProxies.map(proxy => ({
        via: proxy.replace(/^https?:\/\//, '').split('/')[0],
        url: proxy + encodeURIComponent(targetUrl)
      }))
    ];

    let lastError = new Error('Aucune tentative');
    for (const candidate of candidates) {
      try {
        const data = await UTIL.fetchJson(candidate.url, {}, CONFIG.requestTimeoutMs);
        attempts.push({ via: candidate.via, ok: true });
        return data;
      } catch (error) {
        attempts.push({ via: candidate.via, ok: false, error: String(error.message || error) });
        lastError = error;
      }
    }
    throw lastError;
  }

  function normalize(child) {
    const post = child && child.data;
    if (!post || post.stickied) return null;
    const thumbnail = post.thumbnail && /^https?:\/\//.test(post.thumbnail)
      ? post.thumbnail
      : null;
    const preview = post.preview && post.preview.images && post.preview.images[0]
      ? post.preview.images[0].source.url
      : null;

    return SOURCE_BASE.makeResult({
      source: ID,
      sourceLabel: `Reddit · r/${post.subreddit}`,
      author: post.author,
      authorUrl: post.author && post.author !== '[deleted]'
        ? `https://www.reddit.com/user/${post.author}`
        : null,
      title: post.title,
      text: post.selftext || '',
      url: post.permalink ? `https://www.reddit.com${post.permalink}` : post.url,
      image: preview || thumbnail,
      createdAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
      nsfw: Boolean(post.over_18)
    });
  }

  async function search(context) {
    const attempts = [];
    try {
      const data = await fetchWithFallbacks(buildUrl(context.query), attempts);
      const children = data && data.data && Array.isArray(data.data.children)
        ? data.data.children
        : [];
      const results = children.map(normalize).filter(Boolean);
      return SOURCE_BASE.report(ID, LABEL, results, null, attempts);
    } catch (error) {
      return SOURCE_BASE.report(ID, LABEL, [], error, attempts);
    }
  }

  return { id: ID, label: LABEL, search, normalize, buildUrl };
})();

if (typeof window !== 'undefined') window.SOURCE_REDDIT = SOURCE_REDDIT;
