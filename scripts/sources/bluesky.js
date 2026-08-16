// Connecteur Bluesky — API publique AppView (app.bsky.feed.searchPosts).
// Aucune authentification requise, CORS ouvert : c'est la source la plus fiable
// depuis un site statique.

const SOURCE_BLUESKY = (() => {
  const ID = 'bluesky';
  const LABEL = 'Bluesky';

  function postUrl(uri, handle) {
    // Un URI AT ressemble à at://did:plc:xxxx/app.bsky.feed.post/3k...
    const rkey = String(uri || '').split('/').pop();
    if (!rkey || !handle) return null;
    return `https://bsky.app/profile/${handle}/post/${rkey}`;
  }

  function imageOf(post) {
    const embed = post.embed;
    if (!embed) return null;
    const images = embed.images || (embed.media && embed.media.images);
    if (Array.isArray(images) && images.length) {
      return images[0].thumb || images[0].fullsize || null;
    }
    return null;
  }

  function normalize(post) {
    if (!post || !post.record) return null;
    const author = post.author || {};
    return SOURCE_BASE.makeResult({
      source: ID,
      sourceLabel: 'Bluesky',
      author: author.displayName || author.handle || 'anonyme',
      authorUrl: author.handle ? `https://bsky.app/profile/${author.handle}` : null,
      title: '',
      text: post.record.text || '',
      url: postUrl(post.uri, author.handle),
      image: imageOf(post),
      createdAt: post.record.createdAt || post.indexedAt || null,
      nsfw: Array.isArray(post.labels) && post.labels.length > 0
    });
  }

  async function search(context) {
    const attempts = [];
    const query = context.query || context.placeLabel || 'rencontre';
    const params = new URLSearchParams({
      q: query,
      limit: String(CONFIG.bluesky.limit),
      sort: 'latest'
    });
    const url = `${CONFIG.bluesky.endpoint}?${params}`;
    try {
      const data = await UTIL.fetchJson(url, {}, CONFIG.requestTimeoutMs);
      attempts.push({ via: 'public.api.bsky.app', ok: true });
      const posts = Array.isArray(data && data.posts) ? data.posts : [];
      return SOURCE_BASE.report(ID, LABEL, posts.map(normalize).filter(Boolean), null, attempts);
    } catch (error) {
      attempts.push({ via: 'public.api.bsky.app', ok: false, error: String(error.message || error) });
      return SOURCE_BASE.report(ID, LABEL, [], error, attempts);
    }
  }

  return { id: ID, label: LABEL, search, normalize };
})();

if (typeof window !== 'undefined') window.SOURCE_BLUESKY = SOURCE_BLUESKY;
