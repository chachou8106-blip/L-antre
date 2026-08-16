// Connecteur Lemmy — API v3 publique des instances fédérées, sans compte.
// Chaque instance est interrogée indépendamment : si l'une tombe, les autres
// continuent de répondre.

const SOURCE_LEMMY = (() => {
  const ID = 'lemmy';
  const LABEL = 'Lemmy';

  function normalize(view, instance) {
    const post = view && view.post;
    if (!post) return null;
    const creator = view.creator || {};
    const community = view.community || {};
    const host = instance.replace(/^https?:\/\//, '');

    return SOURCE_BASE.makeResult({
      source: ID,
      sourceLabel: `Lemmy · ${community.name ? `c/${community.name}` : host}`,
      author: creator.display_name || creator.name || 'anonyme',
      authorUrl: creator.actor_id || null,
      title: post.name || '',
      text: post.body || '',
      url: post.ap_id || `${instance}/post/${post.id}`,
      image: post.thumbnail_url || null,
      createdAt: post.published ? new Date(post.published + 'Z').toISOString() : null,
      nsfw: Boolean(post.nsfw || community.nsfw)
    });
  }

  async function searchInstance(instance, query, attempts) {
    const params = new URLSearchParams({
      q: query || 'r4r',
      type_: 'Posts',
      sort: 'New',
      listing_type: 'All',
      limit: String(CONFIG.lemmy.limit)
    });
    const url = `${instance}/api/v3/search?${params}`;
    const host = instance.replace(/^https?:\/\//, '');
    try {
      const data = await UTIL.fetchJson(url, {}, CONFIG.requestTimeoutMs);
      attempts.push({ via: host, ok: true });
      const posts = Array.isArray(data && data.posts) ? data.posts : [];
      return posts.map(view => normalize(view, instance)).filter(Boolean);
    } catch (error) {
      attempts.push({ via: host, ok: false, error: String(error.message || error) });
      return null;
    }
  }

  async function search(context) {
    const attempts = [];
    const batches = await Promise.all(
      CONFIG.lemmy.instances.map(instance =>
        searchInstance(instance, context.query, attempts)
      )
    );
    const succeeded = batches.filter(Array.isArray);
    if (!succeeded.length) {
      return SOURCE_BASE.report(ID, LABEL, [], new Error('Toutes les instances ont échoué'), attempts);
    }
    return SOURCE_BASE.report(ID, LABEL, succeeded.flat(), null, attempts);
  }

  return { id: ID, label: LABEL, search, normalize };
})();

if (typeof window !== 'undefined') window.SOURCE_LEMMY = SOURCE_LEMMY;
