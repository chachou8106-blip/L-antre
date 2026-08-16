// Connecteur Mastodon — timelines de hashtags publiques.
// L'API de recherche demande un compte, mais /api/v1/timelines/tag/<tag> est
// ouverte à tous : on balaie donc les hashtags configurés et on filtre ensuite
// le texte localement.

const SOURCE_MASTODON = (() => {
  const ID = 'mastodon';
  const LABEL = 'Mastodon';

  function normalize(status, instance) {
    if (!status) return null;
    const account = status.account || {};
    const media = Array.isArray(status.media_attachments) ? status.media_attachments : [];
    const image = media.find(item => item.type === 'image');
    const host = instance.replace(/^https?:\/\//, '');

    return SOURCE_BASE.makeResult({
      source: ID,
      sourceLabel: `Mastodon · ${host}`,
      author: account.display_name || account.acct || 'anonyme',
      authorUrl: account.url || null,
      title: status.spoiler_text || '',
      text: UTIL.htmlToText(status.content),
      url: status.url || status.uri,
      image: image ? image.preview_url || image.url : null,
      createdAt: status.created_at || null,
      nsfw: Boolean(status.sensitive)
    });
  }

  async function fetchTag(instance, tag, attempts) {
    const url = `${instance}/api/v1/timelines/tag/${encodeURIComponent(tag)}?limit=${CONFIG.mastodon.limit}`;
    const host = instance.replace(/^https?:\/\//, '');
    try {
      const data = await UTIL.fetchJson(url, {}, CONFIG.requestTimeoutMs);
      attempts.push({ via: `${host} #${tag}`, ok: true });
      return Array.isArray(data) ? data.map(status => normalize(status, instance)).filter(Boolean) : [];
    } catch (error) {
      attempts.push({ via: `${host} #${tag}`, ok: false, error: String(error.message || error) });
      return null;
    }
  }

  async function search() {
    const attempts = [];
    const jobs = [];
    for (const instance of CONFIG.mastodon.instances) {
      for (const tag of CONFIG.mastodon.tags) {
        jobs.push(fetchTag(instance, tag, attempts));
      }
    }
    const batches = await Promise.all(jobs);
    const succeeded = batches.filter(Array.isArray);
    if (!succeeded.length) {
      return SOURCE_BASE.report(ID, LABEL, [], new Error('Aucune instance joignable'), attempts);
    }
    return SOURCE_BASE.report(ID, LABEL, succeeded.flat(), null, attempts);
  }

  return { id: ID, label: LABEL, search, normalize };
})();

if (typeof window !== 'undefined') window.SOURCE_MASTODON = SOURCE_MASTODON;
